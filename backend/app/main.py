from fastapi import FastAPI
import os
from openai import OpenAI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.learn import router as learn_router
from app.db import *
from fastapi.staticfiles import StaticFiles
from app.routes.learn import router as learn_router
load_dotenv()
app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(auth_router)
app.include_router(learn_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your React port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Backend Running"
    }