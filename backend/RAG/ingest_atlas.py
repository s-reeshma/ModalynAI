from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
# 1. Connect
client = MongoClient(os.getenv("MONGO_URI"))
db = client["modalyn_db"]
collection = db["curriculum"]

# 2. Setup Embedding (This converts text -> numbers)
model = SentenceTransformer('all-MiniLM-L6-v2')

def add_content(text, domain):
    # Turn text into a mathematical vector
    vector = model.encode(text).tolist()
    
    # Store in MongoDB
    collection.insert_one({
        "text": text,
        "domain": domain,
        "embedding": vector
    })

# Add your first piece of data!
add_content("Binary search works by dividing a sorted array in half.", "computer_science")
print("Data ingested!")