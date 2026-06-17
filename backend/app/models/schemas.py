from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Each "chunk" of learning
class LessonStep(BaseModel):
    step: int
    title: str
    summary: str
    vark_style: Dict[str, Any]  # Stores Visual, Auditory, Reading, Kinesthetic data

# The active progress document for a user
class UserProgress(BaseModel):
    email: str
    topic: str
    current_step: int
    history: List[LessonStep]