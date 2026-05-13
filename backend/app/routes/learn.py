from fastapi import APIRouter
from app.db import users_collection
from app.gemini_config import client
import json
router = APIRouter()


@router.post("/teach")
async def teach(data: dict):

    email = data.get("email")
    topic = data.get("topic")

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}
    else:
        prefs = user.get("teaching_preferences", {})

    visual = prefs.get("visual", False)
    step = prefs.get("step_by_step", False)
    examples = prefs.get("examples", False)
    analogies = prefs.get("analogies", False)
    concise = prefs.get("concise", False)
    practice = prefs.get("practice", False)

    detail_level = prefs.get("detail_level", "balanced")

    # -------------------------
    # DETAIL LEVEL INSTRUCTION
    # -------------------------

    detail_instruction = ""

    if detail_level == "simple":

        detail_instruction = """
        Teach in a very simple and beginner-friendly way.
        Avoid technical jargon.
        Keep explanations short and intuitive.
        """

    elif detail_level == "balanced":

        detail_instruction = """
        Teach with balanced detail.
        Explain concepts clearly while also introducing important technical ideas.
        """

    elif detail_level == "deep":

        detail_instruction = """
        Teach in depth.
        Include detailed reasoning, internal working,
        theory, technical terminology,
        edge cases, and advanced intuition.
        """

    # -------------------------
    # MAIN PROMPT
    # -------------------------

    prompt = f"""
    You are an adaptive AI tutor.

    Teach the topic: {topic}

    Student Preferences:

    Visual Learner: {visual}
    Step By Step: {step}
    Examples Wanted: {examples}
    Practice Questions: {practice}
    Concise Answers: {concise}
    Analogies Wanted: {analogies}

    Teaching Style:
    {detail_instruction}

    Return the response ONLY in valid JSON.

    Format:

    {{
    "explanation": "",
    "analogy": "",
    "example": "",
    "practice": ""
    }}

    Do not use markdown.
    Do not add extra text.
    Do not wrap in ```json.

    Keep the teaching adaptive and engaging.
    """

    # -------------------------
    # DYNAMIC ADAPTATION
    # -------------------------

    if visual:
        prompt += """
        Use visual imagination and spatial explanations.
        """

    if step:
        prompt += """
        Break concepts into numbered steps.
        """

    if examples:
        prompt += """
        Give practical real-world examples.
        """

    if analogies:
        prompt += """
        Use intuitive analogies.
        """

    if concise:
        prompt += """
        Keep explanations short and focused.
        """

    if practice:
        prompt += """
        At the end, give one practice question.
        """

    # -------------------------
    # MODEL FALLBACK SYSTEM
    # -------------------------

    # -------------------------
# MODEL FALLBACK SYSTEM
# -------------------------

    models = [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite"
    ]

    ai_text = None

    for model_name in models:

        try:

            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )

            raw_text = response.text.strip()

            # remove markdown if model adds it
            raw_text = raw_text.replace("```json", "")
            raw_text = raw_text.replace("```", "")

            parsed = json.loads(raw_text)

            ai_text = {
                "explanation": parsed.get("explanation", ""),
                "analogy": parsed.get("analogy", ""),
                "example": parsed.get("example", ""),
                "practice": parsed.get("practice", "")}

            print(f"SUCCESS WITH: {model_name}")

            break

        except Exception as e:

            print(f"{model_name} FAILED:", e)

    # -------------------------
    # FALLBACK MESSAGE
    # -------------------------

    if ai_text is None:

        ai_text = {
            "explanation": "AI servers are currently overloaded. Please try again in a moment.",
            "analogy": "",
            "example": "",
            "practice": ""
        }
    return {
        "topic": topic,
        "response": ai_text,
        "preferences": prefs
    }


@router.post("/feedback")
async def feedback(data: dict):

    email = data.get("email")
    topic = data.get("topic")
    feedback = data.get("feedback")

    user = users_collection.find_one({"email": email})

    prefs = user.get("teaching_preferences", {})

    # BASIC ADAPTATION

    if feedback == "bad":

        prefs["step_by_step"] = True
        prefs["examples"] = True

    # CUSTOM FEEDBACK

    custom_text = data.get("text", "")

    if feedback == "custom" and custom_text:

        prefs["custom_notes"] = custom_text

    users_collection.update_one(
        {"email": email},
        {"$set": {"teaching_preferences": prefs}}
    )

    return {
        "message": "Feedback saved",
        "updated_preferences": prefs
    }