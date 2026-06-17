
from fastapi import APIRouter, HTTPException
from app.models.schemas import UserProgress,LessonStep
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
    clean_topic = normalize_topic(raw_topic)
    if not email or not raw_topic:
        raise HTTPException(status_code=400, detail="Email and topic are required")

    # 1. Fetch user
    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    # 2. Safely get scores & determine dominant style
    raw_scores = user.get("learning_style", {})
    if not isinstance(raw_scores, dict):
        style_scores = {"visual": 1.0, "reading": 1.0, "kinesthetic": 1.0, "auditory": 1.0}
    else:
        style_scores = {k: float(str(v)) for k, v in raw_scores.items()}
    
    dominant_style = max(style_scores, key=style_scores.get)
    existing_doc = lessons_collection.find_one({"email": email, "topic": clean_topic})
    current_step = len(existing_doc.get("steps", [])) + 1 if existing_doc else 1
    history_list = []
    if existing_doc and "steps" in existing_doc:
        # Extract only the titles or summaries for context
        history_list = [s.get("content", {}).get("explanation", "")[:50] for s in existing_doc["steps"]]
    
    # 3. Setup instructions
    prefs = user.get("teaching_preferences", {})
    detail_level = prefs.get("detail_level", "balanced")

    detail_instruction = {
        "simple": "Teach very simple and beginner-friendly.",
        "balanced": "Teach balanced with clarity + concepts.",
        "deep": "Teach deeply with theory and intuition."
    }.get(detail_level, "Teach balanced with clarity + concepts.")

    style_prompts = {
        "visual": "Use markdown tables, ASCII diagrams, and distinct visual formatting. Explain concepts using visual structures.",
        "reading": "Use detailed paragraphs, structured headers, and comprehensive text-based explanations.",
        "kinesthetic": "Include 'Try it yourself' coding tasks, step-by-step logic, and interactive, hands-on examples.",
        "auditory": "Use a conversational, spoken-word tone with rhythmic structure and engaging analogies as if talking to a friend."
    }

    # 4. Inject EVERYTHING into the prompt
    prompt = f"""
    You are an adaptive AI tutor.
    Topic: {clean_topic}
    Dominant Learning Style: {dominant_style}
    PREVIOUSLY TAUGHT:{history_list}
    CURRENT STEP: {current_step}
    INSTRUCTION: 
    1. Analyze the PREVIOUSLY TAUGHT steps.
    2. Do NOT repeat content already covered. 
    3. Generate the NEXT logical step in the progression. 
       - If step 1 was a definition, step 2 must be an application or advanced concept.
    Instructional Rules:
    {detail_instruction}
    Style Adaptation: {style_prompts.get(dominant_style)}
    User Preferences:
    {json.dumps(prefs)}
    """

    # ... (rest of your logic remains the same)

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
        "topic": clean_topic,
        "response": ai_text,
        "preferences": prefs
    }

    # -------------------------------------------------------------
    # WRITE TO PERSISTENT CACHE & UPDATE USER HISTORY
    # -------------------------------------------------------------
    if "error" not in ai_text.get("explanation", ""):
        lessons_collection.update_one(
            {"email": email, "topic": clean_topic, "detail_level": detail_level},
            {
                "$push": {
                    "steps": {
                        "step": current_step,
                        "content": ai_text,
                        "modality": dominant_style,
                        "timestamp": datetime.utcnow()
                    }
                },
                "$set": {
                    "current_step": current_step,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )
        # 2. Append this event to the user's interactive reading log history
        users_collection.update_one(
            {"email": email},
            {"$addToSet": {
                "learning_log": {
                    "topic": clean_topic,
                    "timestamp": datetime.utcnow(),
                    "action": "lesson_generated"
                }
            }}
        )
    return {"topic": clean_topic, "response": ai_text}


@router.get("/history/{email}")
async def get_history(email: str, topic: str = None):
    # If a topic is requested, return the steps for that specific lesson
    if topic:
        lesson = lessons_collection.find_one({"email": email, "topic": topic})
        if lesson:
            # Convert ObjectId to string to prevent your 500 error!
            steps = lesson.get("steps", [])
            for step in steps:
                if "_id" in step: step["_id"] = str(step["_id"])
            return {"steps": steps}
        return {"steps": []}

    cursor = lessons_collection.find({"email": email}).sort("last_updated", -1)
    return {"history": [{"topic": l["topic"], "detail_level": l["detail_level"]} for l in cursor]}
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

    if feedback_status == "custom" and text:
        # Ask Gemini to categorize
        analysis = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"Classify this student feedback into visual, reading, kinesthetic, or auditory: '{text}'"
        )
        detected_style = analysis.text.strip().lower()
        
        # Update weights (Only once!)
        if detected_style in ["visual", "reading", "kinesthetic", "auditory"]:
            users_collection.update_one(
                {"email": email},
                {"$inc": {f"learning_style.{detected_style}": 0.5}}
            )
            
    return {"message": "Feedback saved", "updated_preferences": prefs}

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
@router.post("/add-step")
async def add_next_step(data: dict):
    email = data.get("email")
    topic = data.get("topic")
    step_data = data.get("step_data")

    # Use $inc to atomically increment the step
    # Use $push to add the new content to history
    db.user_progress.update_one(
        {"email": email, "topic": topic},
        {
            "$push": {"history": step_data},
            "$inc": {"current_step": 1} 
        },
        upsert=True
    )
    return {"status": "success"}