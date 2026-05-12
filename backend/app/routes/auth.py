from fastapi import APIRouter
from app.db import users_collection

router = APIRouter()

# -------------------------
# SAVE USER (CREATE / INIT)
# -------------------------
@router.post("/save-user")
async def save_user(user: dict):

    try:
        email = user.get("email")

        if not email:
            return {"error": "Email is required"}

        new_user = {
            "name": user.get("name", ""),
            "email": email,
            "photo": user.get("photo", ""),

            "age": "",
            "learning_goal": "",
            "favorite_style": "",

            "xp": 0,
            "streak": 0,

            "completed_topics": [],
            "weak_areas": [],
            "learning_style": "unknown",
            "onboarding_completed": False,
            "teaching_preferences": {
            "visual": False,
            "step_by_step": False,
            "examples": False,
            "analogies": False,
            "concise": False,
            "practice": False,
            "frustration": "",
            "onboarding_completed": False,
            "detail_level": "balanced"
            }
        }

        # ✅ Create only if not exists (no duplicates)
        users_collection.update_one(
            {"email": email},
            {"$setOnInsert": new_user},
            upsert=True
        )

        return {"message": "User saved successfully"}

    except Exception as e:
        return {"error": str(e)}


# -------------------------
# GET USER
# -------------------------
@router.get("/get-user/{email}")
async def get_user(email: str):

    try:
        user = users_collection.find_one(
            {"email": email},
            {"_id": 0}
        )

        # ✅ ALWAYS return full structure (prevents frontend crash)
        if not user:
            return {
                "name": "",
                "email": email,
                "photo": "",
                "age": "",
                "learning_goal": "",
                "favorite_style": "",
                "xp": 0,
                "streak": 0,
                "completed_topics": [],
                "weak_areas": [],
                "learning_style": "unknown",
                "teaching_preferences": {
                "visual": False,
                "step_by_step": False,
                "examples": False,
                "analogies": False,
                "concise": False,
                "practice": False,
                "frustration": "",
                "onboarding_completed": False,
                "detail_level": "balanced"
    }
            }

        return user

    except Exception as e:
        return {"error": str(e)}


# -------------------------
# UPDATE USER PROFILE
# -------------------------
@router.put("/update-user/{email}")
async def update_user(email: str, data: dict):

    try:

        allowed_fields = [
            "name",
            "age",
            "learning_goal",
            "favorite_style",
            "teaching_preferences",
            "onboarding_completed"
        ]

        update_fields = {
            field: data[field]
            for field in allowed_fields
            if field in data
        }

        if not update_fields:
            return {
                "message": "No valid fields to update"
            }

        result = users_collection.update_one(
            {"email": email},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return {
                "error": "User not found"
            }

        return {
            "message": "Profile updated successfully",
            "updated_fields": update_fields
        }

    except Exception as e:
        return {"error": str(e)}