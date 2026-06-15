from fastapi import APIRouter
from app.db import users_collection
from bson import ObjectId, Decimal128
router = APIRouter()
def json_serializable(doc):
    """Recursively converts BSON types to JSON-friendly types."""
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, Decimal128):
        return float(doc.to_decimal()) # Convert to standard float
    if isinstance(doc, dict):
        return {k: json_serializable(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [json_serializable(i) for i in doc]
    return doc
# -------------------------
# SAVE USER (CREATE / INIT)
# -------------------------
@router.post("/save-user")
async def save_user(user: dict):

    try:
        
        email = user.get("email")
        print("SAVE USER CALLED:", email)

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
            "learning_log": [],
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
        print(user)
        # ✅ Create only if not exists (no duplicates)
        users_collection.update_one(
            {"email": email},
            {"$setOnInsert": new_user},
            upsert=True
        )

        return {"message": result.upserted_id}

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
            
        )
        user["_id"] = str(user["_id"])
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
                "learning_log": [],
                "completed_topics": [],
                "weak_areas": [],
                "learning_style":{
                "visual": 1.0,
                "reading": 1.0,
                "kinesthetic": 1.0,
                "auditory": 1.0
                 },
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

        return json_serializable(user)

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