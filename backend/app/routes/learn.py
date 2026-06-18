
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from app.utils.va import dispatch_media_services
from app.models.schemas import UserProgress,LessonStep
from app.db import users_collection, lessons_collection # Added persistent collection
from app.gemini_config import client
from google.genai import types # Added for native structured outputs
from pydantic import BaseModel
from bson.decimal128 import Decimal128
from datetime import datetime
import json
from app.utils.clean_topic import normalize_topic
import re
import requests


router = APIRouter()
async def get_ollama_response(prompt):
    url = "http://127.0.0.1:11434/api/generate"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "model": "llama3",
        "prompt": f"{prompt}\n\nEnsure you follow this JSON schema: {TeachResponseSchema.model_json_schema()}",
        "stream": False,
        "options": {"temperature": 0.0}
    }
    
    try:
        # Add headers here
        response = requests.post(url, json=payload, headers=headers, timeout=210)
        if response.status_code == 200:
            # The 'response' field contains the generated text
            return response.json().get("response")
        else:
            print(f"Ollama API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"DEBUG - Full Ollama connection error: {type(e).__name__}: {e}")
    return {
        "explanation": "Ollama is currently unreachable.",
        "diagram_code": "", "audio_script": "", "kinesthetic_task": "", "practice": ""
    }
def clean_and_parse_json(raw_response):
    # This regex finds the first { and the last } to extract pure JSON
    match = re.search(r'\{.*\}', raw_response, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return None
# Define the explicit shape we expect back from Gemini
class TeachResponseSchema(BaseModel):
    explanation: str
    diagram_code: str
    audio_script: str
    kinesthetic_task: str
    practice: str

@router.post("/teach")
async def teach(data: dict):
    email = data.get("email")
    raw_topic = data.get("topic")
    clean_topic = normalize_topic(raw_topic)
    enriched_data = {
        "explanation": "AI temporarily unavailable.",
        "diagram_code": "", "audio_script": "", 
        "kinesthetic_task": "", "practice": ""
    }
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
        "visual": "If the user is visual, provide a detailed Mermaid.js diagram. Use 'graph TD' for structures, 'sequenceDiagram' for processes, and 'classDiagram' for code architecture. Ensure the syntax is perfect and descriptive..",
        "reading": "Use detailed paragraphs, structured headers, and comprehensive  detailed text-based explanations.",
        "kinesthetic": " If kinesthetic, provide interactive_task (a step-by-step logic puzzle or a snippet of code where the user must fill in a blank).",
        "auditory": "If auditory, provide audio_script with pauses and intonation cues. tone with rhythmic structure and engaging analogies as if talking to a friend."
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
    Important:
    Your response must be a single, valid JSON object ONLY. 
    Keys: explanation, diagram_code (Must be valid Mermaid.js syntax for technical diagrams) audio_script, kinesthetic_task, practice,
    Instructional Rules: 
    - Include ALL keys listed above. 
    - If a field is not applicable to the current style, set it to an empty string ''.
    Important Rules for Mermaid.js:
    1. Provide ONLY the raw code starting with 'graph TD', 'sequenceDiagram', etc.
    2. DO NOT include markdown code fences (```mermaid ... ```) unless you strip them out.
    3. Keep labels short; avoid special characters like quotes or brackets inside labels.
    4. If the code is not perfect, the UI will break. Be extremely precise.
    {detail_instruction}
    Style Adaptation: {style_prompts.get(dominant_style)}
    User Preferences:
    {json.dumps(prefs)}
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
    except Exception as e:
        print(f"GEMINI FAILED: {e}")
        
        # Check if the error is a Quota/Rate Limit issue
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            print("Quota exhausted! Switching to local Ollama...")
            ollama_raw = await get_ollama_response(prompt)
            
            try:
                # Handle JSON parsing for Ollama
                parsed_data = json.loads(ollama_raw) if isinstance(ollama_raw, str) else ollama_raw
                enriched_data = await dispatch_media_services(parsed_data, dominant_style)
            except Exception as parse_err:
                enriched_data = {"explanation": f"Ollama error: {parse_err}"}
        else:
            # Handle all other errors (network, parsing, etc.)
            enriched_data = {
                "explanation": "System error. Please check backend logs.",
                "diagram_code": "", "audio_script": "", "kinesthetic_task": "", 
                "practice": ""
            }
        if not isinstance(enriched_data, dict):
            enriched_data = {
            "explanation": "System error occurred.",
            "diagram_code": "", "audio_script": "", 
            "kinesthetic_task": "", "practice": ""
            }

    result = {
        "topic": clean_topic,
        "response": enriched_data,
        "preferences": prefs
    }

    # -------------------------------------------------------------
    # WRITE TO PERSISTENT CACHE & UPDATE USER HISTORY
    # -------------------------------------------------------------
    if "AI temporarily" not in enriched_data.get("explanation", ""):
        lessons_collection.update_one(
            {"email": email, "topic": clean_topic, "detail_level": detail_level},
            {
                "$push": {
                    "steps": {
                        "step": current_step,
                        "content": enriched_data,
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
    return {"topic": clean_topic, "response": enriched_data}


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
        else:
            new_lesson = await teach({"email": email, "topic": topic})
            if not new_lesson or new_lesson.get("explanation") == "AI temporarily unavailable.":
                return {"error": "Could not generate lesson", "status": 500}
            return {
            "steps": new_lesson.get("response", {}).get("steps", []), 
            "history": [] # Define this properly if you need it
            }

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
        try:
        # Ask Gemini to categorize
            analysis = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f" you are a AI tutor Classify this student feedback into visual, reading, kinesthetic, or auditory: '{text}' give one word responce"
            )
        except Exception as e:
            print(f"GEMINI FAILED: {e}")
        
        # Check if the error is a Quota/Rate Limit issue
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Quota exhausted! Switching to local Ollama...")
                analysis = await get_ollama_response("you are a AI tutor Classify this student feedback into visual, reading, kinesthetic, or auditory: '{text}' give one word responce")
            
        detected_style = analysis.text.strip().lower()
        
        # Update weights (Only once!)
        if detected_style in ["visual", "reading", "kinesthetic", "auditory"]:
            r=users_collection.update_one(
                {"email": email},
                {"$inc": {f"learning_style.{detected_style}": Decimal128("1")}}
            )
            print(f"Matched count: {r.matched_count}")
            
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
    raw_scores = user.get("learning_style", {})
    dominant_style = max(style_scores, key=style_scores.get)
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
            print(f"GEMINI FAILED: {e}")
        
        # Check if the error is a Quota/Rate Limit issue
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Quota exhausted! Switching to local Ollama...")
                response = await get_ollama_response(prompt)
                resp = await PracticeSchema(parsed_data, "dominant_style")
            return json.loads(resp.text)
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