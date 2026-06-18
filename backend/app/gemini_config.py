from google import genai
from openai import OpenAI
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

load_dotenv(os.path.join(BASE_DIR, ".env"))

API_KEY = os.getenv("GEMINI_API_KEY")

print("API KEY LOADED:", API_KEY[:10], "...")
if os.getenv("OPENAI_API_KEY"):
    print("API Key loaded successfully!")
else:
    print("Error: API Key not found.")
# -------------------------
# GEMINI CLIENT
# -------------------------

client = genai.Client(
    api_key=API_KEY
)