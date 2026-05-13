from fastapi import APIRouter
from app.db import users_collection

router = APIRouter()

@router.post("/teach")
async def teach(data: dict):

    email = data.get("email")
    topic = data.get("topic")

    user = users_collection.find_one({"email": email})

    prefs = user.get("teaching_preferences", {})

    visual = prefs.get("visual", False)
    step = prefs.get("step_by_step", False)
    examples = prefs.get("examples", False)

    # 🔥 SIMPLE AI LOGIC (you can later replace with LLM)

    explanation = f"{topic} is a concept explained in a simple way."

    if step:
        explanation = "Step 1: Understand basics. Step 2: Build intuition. Step 3: Apply."

    analogy = "Think of it like organizing objects in real life."

    if visual:
        analogy += " Imagine it visually like boxes inside boxes."

    example = "Simple example will go here."

    if examples:
        example = f"Example of {topic} in real life / code."

    return {
        "explanation": explanation,
        "analogy": analogy,
        "example": example,
        "confidence_check": "Did you understand?"
    }
@router.post("/feedback")
async def feedback(data: dict):

    email = data.get("email")
    topic = data.get("topic")
    feedback = data.get("feedback")

    user = users_collection.find_one({"email": email})
    prefs = user.get("teaching_preferences", {})

    # 🔥 BASIC ADAPTATION
    if feedback == "bad":
        prefs["step_by_step"] = True
        prefs["examples"] = True

    # 🧠 NEW: CUSTOM FEEDBACK (VERY IMPORTANT)
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