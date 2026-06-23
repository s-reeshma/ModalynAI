from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "say hello"}]
    )
    print("OpenAI API Success:")
    print(response.choices[0].message.content)
except Exception as e:
    print("OpenAI API Failed:", e)
