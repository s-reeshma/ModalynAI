import os
import sys

# Add backend dir to path so we can import app.db
backend_dir = r"c:\Users\csekh\OneDrive\Desktop\adaptive AI Agent\backend"
sys.path.append(backend_dir)

from app.db import lessons_collection

# Delete the bad lesson for "machine learning"
result = lessons_collection.delete_many({"topic": "machine learning"})
print(f"Deleted {result.deleted_count} bad lessons for 'machine learning'.")
