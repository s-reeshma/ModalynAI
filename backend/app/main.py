from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.learn import router as learn_router

from app.db import *

app = FastAPI()
app.include_router(auth_router)
app.include_router(learn_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Backend Running"
    }