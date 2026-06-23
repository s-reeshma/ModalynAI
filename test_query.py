from pymongo import MongoClient
import certifi
import os
import json
from dotenv import load_dotenv

load_dotenv("backend/.env")
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where()
)
db = client["adaptive_ai"]
lessons_collection = db["lessons"]

print("Collections in adaptive_ai:", db.list_collection_names())
lessons = list(lessons_collection.find().limit(5))
for idx, lesson in enumerate(lessons):
    print(f"\n--- Lesson {idx+1} ---")
    print("Topic:", lesson.get("topic"))
    print("Email:", lesson.get("email"))
    steps = lesson.get("steps", [])
    print(f"Number of steps: {len(steps)}")
    if steps:
        print("First step structure:", json.dumps(steps[0], indent=2, default=str))
