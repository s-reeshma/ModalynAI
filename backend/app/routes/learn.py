from fastapi import APIRouter
from app.db import users_collection
from app.gemini_config import client
import json
router = APIRouter()

lesson_cache = {}

@router.post("/teach")
async def teach(data: dict):

    email = data.get("email")
    topic = data.get("topic")

    cache_key = f"{email}:{topic}"

    # -------------------------
    # CACHE CHECK (SAVES QUOTA)
    # -------------------------
    if cache_key in lesson_cache:
        return lesson_cache[cache_key]

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    prefs = user.get("teaching_preferences", {})

    visual = prefs.get("visual", False)
    step = prefs.get("step_by_step", False)
    examples = prefs.get("examples", False)
    analogies = prefs.get("analogies", False)
    concise = prefs.get("concise", False)
    practice = prefs.get("practice", False)

    detail_level = prefs.get("detail_level", "balanced")

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
Visual: {visual}
Step-by-step: {step}
Examples: {examples}
Analogies: {analogies}
Concise: {concise}
Practice: {practice}

Style:
{detail_instruction}

Return ONLY JSON:
{{
  "explanation": "",
  "analogy": "",
  "example": "",
  "practice": ""
}}
"""

    # -------------------------
    # ONLY ONE MODEL (FIX QUOTA BURN)
    # -------------------------
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )

        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "")

        parsed = json.loads(raw)

        ai_text = {
            "explanation": parsed.get("explanation", ""),
            "analogy": parsed.get("analogy", ""),
            "example": parsed.get("example", ""),
            "practice": parsed.get("practice", "")
        }

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

    # -------------------------
    # SAVE CACHE (VERY IMPORTANT)
    # -------------------------
    lesson_cache[cache_key] = result
    print( lesson_cache[cache_key])
    return result


@router.post("/feedback")
async def feedback(data: dict):

    email = data.get("email")
    topic = data.get("topic")
    feedback = data.get("feedback")
    text = data.get("text", "")

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    prefs = user.get("teaching_preferences", {})

    # -------------------------
    # ADAPTIVE LEARNING RULES
    # -------------------------
    if feedback == "bad":
        prefs["step_by_step"] = True
        prefs["examples"] = True
        prefs["detail_level"] = "simple"

    if feedback == "good":
        prefs["detail_level"] = "balanced"

    if feedback == "custom":
        prefs["custom_notes"] = text

    # store learning history
    learning_log = user.get("learning_log", [])

    learning_log.append({
        "topic": topic,
        "feedback": feedback,
        "text": text,
    })

    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "teaching_preferences": prefs,
                "learning_log": learning_log
            }
        }
    )
    print(learning_log)
    return {
        "message": "Feedback saved",
        "updated_preferences": prefs
    }

@router.post("/practice-check")
async def practice_check(data: dict):

    email = data.get("email")
    topic = data.get("topic")
    question = data.get("question")
    answer = data.get("answer")

    prompt = f"""
        You are an AI tutor evaluating a student's answer.

        Topic: {topic}
        Question: {question}
        Student Answer: {answer}

        Return JSON:
        {{
        "correct": true/false,
        "feedback": "",
        "improved_answer": ""
        }}
        """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )

        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "")

        parsed = json.loads(raw)

        return parsed

    except Exception as e:
        return {
            "correct": False,
            "feedback": "Could not evaluate answer.",
            "improved_answer": ""
        }