from openai import OpenAI
import os
from dotenv import load_dotenv
import uuid
import asyncio
import json
import  edge_tts
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async def generate_image(description: str):
    # DALL-E generation
    response = client.images.generate(
        model="gpt-5.4-mini", 
        prompt=f"Educational diagram, clean vector style: {description}",
        n=1,
        size="1024x1024"
    )
    return response.data[0].url

async def generate_tts(text: str):
    filename = f"audio_{uuid.uuid4()}.mp3"
    filepath = f"static/audio/{filename}"
    
    # Ensure directory exists
    os.makedirs("static/audio", exist_ok=True)
    
    # 2. Use edge-tts to save the file
    communicate = edge_tts.Communicate(text, "en-US-ChristopherNeural")
    await communicate.save(filepath)
    
    # 3. Return the relative URL for the frontend
    return f"/static/audio/{filename}"
async def dispatch_media_services(data, dominant_style):
    # 1. Handle Visuals (Mermaid or Image URL)
    if data.get("diagram_code"):
        # The frontend will pick this up and render it automatically
        pass
    
    if dominant_style == "auditory" and data.get("audio_script"):
        # MUST use await here
        data["audio_url"] = await generate_tts(data["audio_script"])

    return data

    return data