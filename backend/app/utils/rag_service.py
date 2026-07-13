from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
# 1. Connect
client = MongoClient(os.getenv("MONGO_URI"))
collection = client["adaptive_ai"]["curiculum"]
model = SentenceTransformer('all-MiniLM-L6-v2')
from google.genai import types

def identify_domain_smart(topic: str) -> str:
    prompt = f"Categorize the following topic into ONE of these: ['computer_science', 'biology', 'physics', 'general']. Topic: {topic}. Return ONLY the category name."
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip().lower()
    except:
        return "general"

def get_context(user_query, domain):
    query_vector = model.encode(user_query).tolist()
    
    # This is the search command
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "index": "default",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 10,
                "limit": 2,
                "filter": {"domain": {"$eq": domain}}
            }
        }
    ])
    return "\n\n".join([doc["text"] for doc in results])