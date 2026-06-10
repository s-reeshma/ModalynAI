
from fastapi import APIRouter, HTTPException
from app.db import users_collection, lessons_collection # Added persistent collection
from app.gemini_config import client
from google.genai import types # Added for native structured outputs
from pydantic import BaseModel
from datetime import datetime
import json
from app.utils.clean_topic import normalize_topic

router = APIRouter()

# Define the explicit shape we expect back from Gemini
class TeachResponseSchema(BaseModel):
    explanation: str
    analogy: str
    example: str
    practice: str

@router.post("/teach")
async def teach(data: dict):
    email = data.get("email")
    raw_topic = data.get("topic")

    if not email or not raw_topic:
        raise HTTPException(status_code=400, detail="Email and topic are required")

    # 🚨 CRITICAL FIX: Normalize the topic before doing anything else
    clean_topic = normalize_topic(raw_topic)

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    prefs = user.get("teaching_preferences", {})
    detail_level = prefs.get("detail_level", "balanced")

    # Use the 'clean_topic' for the database lookup!
    cached_lesson = lessons_collection.find_one({
        "email": email,
        "topic": clean_topic, # <--- Updated
        "detail_level": detail_level
    })

    if cached_lesson:
        print(f"🚀 Cache Hit for: {clean_topic}")
        return {
            "topic": clean_topic, # <--- Return clean topic to UI
            "response": cached_lesson["response"],
            "preferences": prefs,
            "from_cache": True
        }

    # If cache misses, compute the prompt instructions
    detail_instruction = ""
    if detail_level == "simple":
        detail_instruction = "Teach very simple and beginner-friendly."
    elif detail_level == "balanced":
        detail_instruction = "Teach balanced with clarity + concepts."
    elif detail_level == "deep":
        detail_instruction = "Teach deeply with theory and intuition."

    prompt = f"""
    You are an adaptive AI tutor.
    Topic: {topic}

    Preferences:
    Visual: {prefs.get("visual", False)}
    Step-by-step: {prefs.get("step_by_step", False)}
    Examples: {prefs.get("examples", False)}
    Analogies: {prefs.get("analogies", False)}
    Concise: {prefs.get("concise", False)}
    Practice: {prefs.get("practice", False)}

    Style:
    {detail_instruction}
    """

    try:
        # Use Gemini native Structured Outputs to guarantee a valid JSON object
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TeachResponseSchema,
                temperature=0.3
            )
        )

        ai_text = json.loads(response.text)

    except Exception as e:
        print("MODEL FAILED:", e)
        ai_text = {
            "explanation": "AI temporarily unavailable. Try again later.",
            "analogy": "",
            "example": "",
            "practice": ""
        }

    result = {
        "topic": topic,
        "response": ai_text,
        "preferences": prefs
    }

    # -------------------------------------------------------------
    # WRITE TO PERSISTENT CACHE & UPDATE USER HISTORY
    # -------------------------------------------------------------
    if "error" not in ai_text.get("explanation", ""):
        # 1. Save lesson to the persistent global cache collection
        lessons_collection.update_one(
            {"email": email, "topic": topic, "detail_level": detail_level},
            {"$set": {
                "email": email,
                "topic": topic,
                "detail_level": detail_level,
                "response": ai_text,
                "timestamp": datetime.utcnow()
            }},
            upsert=True
        )

        # 2. Append this event to the user's interactive reading log history
        users_collection.update_one(
            {"email": email},
            {"$addToSet": {
                "learning_log": {
                    "topic": topic,
                    "timestamp": datetime.utcnow(),
                    "action": "lesson_generated"
                }
            }}
        )

    return result


@router.get("/history/{email}")
async def get_history(email: str):
    """
    Returns a unique list of all chapters/topics the user has previously learned.
    This feeds your frontend sidebar menu natively.
    """
    # Fetch all unique lessons generated for this user, sorted by most recent
    cursor = lessons_collection.find({"email": email}).sort("timestamp", -1)
    lessons = list(cursor)
    
    history_list = []
    for lesson in lessons:
        history_list.append({
            "topic": lesson["topic"],
            "detail_level": lesson["detail_level"],
            "timestamp": lesson["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if "timestamp" in lesson else None
        })
        
    return {"history": history_list}


@router.post("/feedback")
async def feedback(data: dict):
    email = data.get("email")
    topic = data.get("topic")
    feedback_status = data.get("feedback")
    text = data.get("text", "")

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    prefs = user.get("teaching_preferences", {})

    if feedback_status == "bad":
        prefs["step_by_step"] = True
        prefs["examples"] = True
        prefs["detail_level"] = "simple"
    elif feedback_status == "good":
        prefs["detail_level"] = "balanced"

    if feedback_status == "custom":
        prefs["custom_notes"] = text

    # Push structured object to array
    new_log_entry = {
        "topic": topic,
        "feedback": feedback_status,
        "text": text,
        "timestamp": datetime.utcnow()
    }

    users_collection.update_one(
        {"email": email},
        {
            "$set": {"teaching_preferences": prefs},
            "$push": {"learning_log": new_log_entry}
        }
    )
    return {
        "message": "Feedback saved",
        "updated_preferences": prefs
    }


@router.post("/practice-check")
async def practice_check(data: dict):
    # Keep your existing structure or update to use response_schema similarly
    email = data.get("email")
    topic = data.get("topic")
    question = data.get("question")
    answer = data.get("answer")

    prompt = f"""
    You are an AI tutor evaluating a student's answer.
    Topic: {topic}
    Question: {question}
    Student Answer: {answer}
    """

    class PracticeSchema(BaseModel):
        correct: bool
        feedback: str
        improved_answer: str

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PracticeSchema
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "correct": False,
            "feedback": f"Could not evaluate answer: {str(e)}",
            "improved_answer": ""
        }