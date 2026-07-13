
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from app.utils.va import dispatch_media_services,VisualTeachResponse, AuditoryTeachResponse,ReadWriteTeachResponse,KinestheticTeachResponse,TeachResponseSchema
from app.models.schemas import UserProgress,LessonStep
from app.db import db, users_collection, lessons_collection, doubts_collection # Added persistent collection
from app.utils.streak import update_user_streak
from app.gemini_config import client
from google.genai import types # Added for native structured outputs
from pydantic import BaseModel, Field, ConfigDict, create_model
from typing import Literal, Union, List, Dict, Any, Optional
from bson.decimal128 import Decimal128
from datetime import datetime
import json
from app.utils.clean_topic import normalize_topic
import re
import requests
import httpx


router = APIRouter()

async def get_ollama_response(prompt: str, json_schema: dict = None) -> dict:
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": "llama3", # Ensure you have pulled this exact model
        "prompt": prompt + "\n\nCRITICAL: Return ONLY valid JSON.",
        "format": "json",  # <-- REMOVED json_schema to speed up Ollama by 10x
        "stream": False
    }
    
    async with httpx.AsyncClient() as client:
        # Give Ollama 120 seconds to think (local AI is slower than cloud)
        response = await client.post(url, json=payload, timeout=220.0) 
        response.raise_for_status()
        
        data = response.json()
        return json.loads(data["response"])

def clean_and_parse_json(raw_response):
    # This regex finds the first { and the last } to extract pure JSON
    match = re.search(r'\{.*\}', raw_response, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return None

async def generate_rich_mock_content(topic: str, modality: str, step: int, detail_level: str = "balanced", custom_query: str = "") -> dict:
    import random
    import httpx
    
    ollama_prompt = f"Teach the topic '{topic}'. This is step {step}. Detail level: {detail_level}. {custom_query}. Provide a thorough, incredibly detailed explanation (3-4 paragraphs). Do NOT use markdown code fences. Just plain text explanation."
    
    try:
        url = "http://127.0.0.1:11434/api/generate"
        payload = {
            "model": "llama3",
            "prompt": ollama_prompt,
            "stream": False
        }
        # Increased timeout here too so it doesn't fail prematurely
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            exp = resp.json().get("response", "").strip()
    except Exception as e:
        print(f"Raw Ollama generation failed. Is Ollama running? Error: {e}")
        exp = f"Let's learn {topic}. (Note: Local AI engine offline. Please open your terminal and run 'ollama run llama3'). The core idea is that {topic} helps us solve problems efficiently."

    practice = f"Can you summarize the main principle of {topic} in your own words?"
    
    content = {"explanation": exp}
    
    if modality == "visual":
        engine = random.choice(["recharts", "reactflow", "mermaid"])
        if engine == "recharts":
            content.update({
                "type": "visual",
                "engine": "recharts",
                "payload": {
                    "type": "line",
                    "xAxisKey": "name",
                    "data": [
                        {"name": "Initial State", "progress": 10},
                        {"name": "Processing", "progress": 60},
                        {"name": "Optimization", "progress": 85},
                        {"name": "Final State", "progress": 100}
                    ],
                    "lines": [{"dataKey": "progress", "stroke": "#4f46e5", "strokeWidth": 3}]
                }
            })
        elif engine == "reactflow":
            content.update({
                "type": "visual",
                "engine": "reactflow",
                "payload": {
                    "nodes": [
                        {"id": "1", "position": {"x": 250, "y": 50}, "data": {"label": f"Core: {topic}"}, "style": {"background": "#4f46e5", "color": "white"}},
                        {"id": "2", "position": {"x": 100, "y": 150}, "data": {"label": "Input Data"}},
                        {"id": "3", "position": {"x": 400, "y": 150}, "data": {"label": "Output Result"}}
                    ],
                    "edges": [
                        {"id": "e1-2", "source": "2", "target": "1", "animated": True},
                        {"id": "e1-3", "source": "1", "target": "3", "animated": True}
                    ]
                }
            })
        else:
            content.update({
                "type": "visual",
                "engine": "mermaid",
                "payload": f"graph LR\n  A[Start {topic}] -->|Processes| B(Internal Logic)\n  B -->|Validates| C{{Check State}}\n  C -->|Pass| D[Success]\n  C -->|Fail| E[Retry]"
            })
    elif modality == "kinesthetic":
        engine = random.choice(["monaco", "dnd"])
        if engine == "monaco":
            content.update({
                "type": "kinesthetic",
                "task_json": {
                    "engine": "monaco",
                    "language": "python",
                    "task_setup": f"Let's practice {topic} practically! Before writing code, understand that {topic} involves manipulating data to achieve a specific outcome. In the editor below, I've provided a boilerplate. Your task is to complete the function so it successfully implements the core logic of {topic}.",
                    "code_snippet": f"# Write your {topic} implementation here\ndef apply_{topic.replace(' ', '_')}(data):\n    # TODO: Implement logic\n    pass\n\nprint(apply_{topic.replace(' ', '_')}('test_input'))",
                    "solution": f"# Example of {topic}\ndef apply_{topic.replace(' ', '_')}(data):\n    return f'Processed {{data}} using {topic}'\n\nprint(apply_{topic.replace(' ', '_')}('test_input'))"
                }
            })
        else:
            content.update({
                "type": "kinesthetic",
                "task_json": {
                    "engine": "dnd",
                    "task_setup": f"To truly grasp {topic}, you need to understand its sequence of operations. Drag and drop the following logical steps into the correct execution order.",
                    "items": [
                        {"id": "item-1", "content": "1. Initialize variables and allocate memory"},
                        {"id": "item-2", "content": "2. Process the input stream"},
                        {"id": "item-3", "content": "3. Handle exceptions and edge cases"},
                        {"id": "item-4", "content": "4. Return the finalized output"}
                    ],
                    "solution": "1 -> 2 -> 3 -> 4"
                }
            })
    elif modality == "auditory":
        script_text = f"Welcome back! Today we are diving into {topic}. "
        if detail_level == "simple":
            script_text += f"Think of {topic} like a recipe. You have inputs, you follow steps, and you get a result. It really is that simple! Don't overcomplicate it."
        elif detail_level == "deep":
            script_text += f"We are going to explore the granular details of {topic}. Notice how the architecture handles state transitions. When building complex systems, engineers rely on {topic} to maintain concurrency and avoid memory leaks."
        else:
            script_text += f"Let's look at {topic} from a balanced perspective. It bridges the gap between raw data and usable features. Imagine you are organizing a library; {topic} acts as your indexing system."
            
        content.update({
            "type": "auditory",
            "audio_script": script_text
        })
    else:
        content.update({
            "type": "read_write",
            "markdown_content": f"## Understanding {topic}\n\nCore Concept: What defines {topic} at its fundamental level.\n\n### Mechanism\nHere is an equation representing the cost: $$O(N^2)$$\n\n### Code Example\n```javascript\nfunction solve() {{\n  console.log('Hello');\n}}\n```",
            "deep_dive_text": f"Diving deeper into {topic}, we can observe that it fundamentally alters how systems manage complexity. By encapsulating logic, {topic} allows developers to scale applications without exponentially increasing technical debt."
        })
        
    return {
        "style_used": modality,
        "content": content,
        "practice_question": practice
    }

# Define the explicit shape we expect back from Gemini


@router.post("/teach")
async def teach(data: dict):
    email = data.get("email")
    raw_topic = data.get("topic")
    clean_topic = normalize_topic(raw_topic)
    enriched_data = {
        "explanation": "AI temporarily unavailable.",
        "diagram_code": "", "audio_script": "", 
        "kinesthetic_task": "", "practice": ""
    }
    STYLE_SCHEMAS = {
    "visual": VisualTeachResponse,
    "reading": ReadWriteTeachResponse,
    "auditory": AuditoryTeachResponse,
    "kinesthetic": KinestheticTeachResponse
}
    if not email or not raw_topic:
        raise HTTPException(status_code=400, detail="Email and topic are required")

    # 1. Fetch user
    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}
        
    user = update_user_streak(user)

    # 2. Safely get scores & determine dominant style
    raw_scores = user.get("learning_style", {})
    if not isinstance(raw_scores, dict) or not raw_scores:
        style_scores = {"visual": 1.0, "reading": 1.0, "kinesthetic": 1.0, "auditory": 1.0}
    else:
        style_scores = {k: float(str(v)) for k, v in raw_scores.items()}
        
    # User's complaint: Feedback updates DB, but content ignores it.
    # Fix: Prioritize dynamic feedback weights over static favorite_style
    dominant_style = max(style_scores, key=style_scores.get)
    
    existing_doc = lessons_collection.find_one({"email": email, "topic": clean_topic})
    needs_reteach = existing_doc.get("needs_reteach", False) if existing_doc else False
    failed_style = existing_doc.get("failed_style", "") if existing_doc else ""
    current_step = len(existing_doc.get("steps", [])) + 1 if existing_doc else 1
    
    # Calculate dominant style
    raw_scores = user.get("learning_style", {})
    if not isinstance(raw_scores, dict) or not raw_scores:
        style_scores = {"visual": 1.0, "reading": 1.0, "kinesthetic": 1.0, "auditory": 1.0}
    else:
        style_scores = {k: float(str(v)) for k, v in raw_scores.items()}

    # --- ADAPTIVE STYLE SWITCHING ---
    if needs_reteach and failed_style in style_scores:
        # If they failed, pick the highest score that is NOT the style they just failed on
        available_styles = {k: v for k, v in style_scores.items() if k != failed_style}
        dominant_style = max(available_styles, key=available_styles.get) if available_styles else "visual"
    else:
        dominant_style = max(style_scores, key=style_scores.get)

    # --- Socratic Progression Logic ---
    if existing_doc and "steps" in existing_doc and len(existing_doc["steps"]) > 0:
        history_texts = []
        for i, s in enumerate(existing_doc["steps"]):
            exp = s.get("content", {}).get("explanation", "")
            history_texts.append(f"Step {i+1} (Style: {s.get('modality')}): {exp}")
        history_context = "\n".join(history_texts)
        
        if needs_reteach:
            progression_instruction = f"""
PREVIOUSLY TAUGHT CONTENT:
{history_context}

CRITICAL INSTRUCTION - RE-TEACH REQUIRED: 
1. The student FAILED the practice question for the previous step. 
2. DO NOT move on to a new concept.
3. You previously taught this using the '{failed_style}' style and they did not understand.
4. Re-teach the EXACT SAME concept, but completely change your approach. Use analogies, simpler terms, and heavily leverage the new requested style: {dominant_style}.
5. End with a new, slightly easier practice question to verify their understanding.
"""
        else:
            progression_instruction = f"""
PREVIOUSLY TAUGHT CONTENT:
{history_context}
CURRENT STEP: {current_step}

INSTRUCTION - NEXT CONCEPT: 
1. The student correctly answered the practice question for the last step. They have mastered it.
2. CRITICAL: DO NOT REPEAT ANY CONCEPT LISTED IN 'PREVIOUSLY TAUGHT CONTENT'. You MUST introduce a COMPLETELY NEW sub-topic or an advanced application.
3. Generate the NEXT logical step (Step {current_step}) in the progression. If you repeat yourself, the system will fail.
"""
    else:
        progression_instruction = f"""
CURRENT STEP: 1

INSTRUCTION: 
You are starting to teach a person the topic "{raw_topic}" from scratch. The person has NO prior knowledge.
Begin with the foundational basics of the topic also give overview of what can this be used for in the future.
CRITICAL: Provide an IN-DEPTH, highly comprehensive explanation. The user MUST fully understand the topic they entered from the ground up, regardless of their preferred learning style.
"""
    
    prefs = user.get("teaching_preferences", {})
    detail_level = prefs.get("detail_level", "balanced")
    next_instruction = prefs.get("next_instruction", "")

    detail_instruction = {
        "simple": "Teach very simple and beginner-friendly.",
        "balanced": "Teach balanced with clarity + concepts.",
        "deep": "Teach deeply with theory and intuition."
    }.get(detail_level, "Teach balanced with clarity + concepts.")
    
    custom_query_instruction = ""
    if next_instruction:
        custom_query_instruction = f"\nCRITICAL USER REQUEST: The user specifically asked or stated: '{next_instruction}'. You MUST prioritize answering this query or focusing the lesson strictly on this request!\n"
        users_collection.update_one({"email": email}, {"$unset": {"teaching_preferences.next_instruction": ""}})

    style_prompts = {
    "visual": """
    Goal: Learn by seeing.
    You are teaching someone with NO prior knowledge. Provide a VERY detailed, comprehensive explanation of the concept first.
    CRITICAL: DO NOT just write text in fancy boxes. You MUST teach the concept visually through state changes, animations, or comic-strip stories.
    
    The 'engine' MUST be one of: 'framer_motion', 'StoryboardEngine', or 'mermaid'.
    
    1. If teaching an algorithm, data structure, or step-by-step process (like Binary Search): use 'framer_motion'.
       This creates an interactive animation in the browser.
       Payload MUST be a JSON object with a 'frames' array.
       Example Payload: {"frames": [{"title": "Target is 62. Middle is 50. 62 > 50 so go Right.", "items": ["62", "75", "87"]}, {"title": "Found 62!", "items": ["62"]}]}
    2. If teaching an analogy or historical concept: use 'StoryboardEngine'.
       Payload Example: {"items": [{"icon": "📖", "text": "Opening dictionary in the middle"}, {"icon": "➡️", "text": "Tearing it in half"}]}
    3. If teaching architecture/relationships: use 'mermaid'.
       Payload Example: {"code": "graph TD\\n A-->B"}
    """,
    
    "auditory": """
    Goal: Learn by listening and conversation.
    You are teaching someone with NO prior knowledge. Provide a VERY detailed, comprehensive explanation.
    Write an engaging, long-form conversational podcast-style script. Use stories, analogies, and verbal walkthroughs.
    Explain the concept thoroughly before giving examples.
    Use phonetic spelling for complex terms and use natural pauses.
    The frontend will use Speech-to-Text, so frame the practice question to expect a verbal answer.
    """,
    
    "kinesthetic": """
    Goal: Learn by doing.
    You are teaching someone with NO prior knowledge. Provide a VERY detailed, comprehensive explanation of the theory first!
    After the theory, design a hands-on coding task or exercise.
    The 'task_json' payload MUST be a JSON object:
    1. If simple code: {"engine": "monaco", "language": "python", "code_snippet": "def test(): pass", "solution": "def test(): print('correct')"}
    2. If full-stack or multi-file web app: {"engine": "sandpack", "template": "react", "files": {"/App.js": "export default function App() { return <h1>Hello</h1> }"}, "solution": "Code for the working app"}
    CRITICAL: You MUST ALWAYS include a 'solution' key in task_json containing the correct answer or completed code.
    """,
    
    "reading": """
    Goal: Learn through notes and text.
    You are teaching someone with NO prior knowledge. Provide a VERY detailed, comprehensive textbook-style explanation.
    Use rich markdown format! You MUST use headers (##), bolding (**text**), and lists.
    For ANY math, algorithms, or equations, use KaTeX formatting wrapped in double dollar signs ($$x^2$$).
    For any code examples, use standard markdown code blocks (```python).
    Return the rich content in the 'markdown_content' field.
    """
    }
    schema = STYLE_SCHEMAS[dominant_style]
    style_prompt = style_prompts[dominant_style]

    def get_typed_example(schema_cls):
        example = {}
        for k, field_info in schema_cls.model_fields.items():
            ann = str(field_info.annotation).lower()
            if "list" in ann:
                example[k] = ["string"]
            elif "dict" in ann:
                example[k] = {"key": "value"}
            else:
                example[k] = "string"
        return example

    example_json = {
        "style_used": dominant_style,
        "content": get_typed_example(schema),
        "practice_question": "string"
    }

    # 1. Get the context from MongoDB
    domain = "general"
    try:
        from app.utils.rag_service import identify_domain_smart, get_context
        domain = identify_domain_smart(raw_topic)
        context = get_context(raw_topic, domain)
    except Exception as e:
        print(f"RAG failed: {e}")
        context = ""

    # 2. Inject context into the prompt
    prompt = f"""
    You are an expert tutor. 
    Use this REFERENCE MATERIAL to teach the student:
    {context}
    
    If the answer is NOT in the material, say so, but use your general knowledge to help.
    Topic: {raw_topic}
    
You are an adaptive AI tutor.
Topic: {raw_topic}
Target Learning Style: {dominant_style}
{custom_query_instruction}

{progression_instruction}

JSON STRUCTURE & CONTENT RULES:
YOUR OUTPUT MUST BE A SINGLE JSON OBJECT WITH THIS EXACT STRUCTURE (replace "string" with actual content):
{json.dumps(example_json, indent=2)}

Do NOT generate fields or null values for learning styles that were not requested.


{detail_instruction}

STYLE ADAPTATION ({dominant_style}):
{style_prompts.get(dominant_style)}

User Preferences:
{json.dumps(prefs)}
"""

    try:
        WrapperSchema = create_model(
            'WrapperSchema',
            style_used=(str, ...),
            content=(schema, ...),
            practice_question=(str, ...)
        )

        # Use Gemini native Structured Outputs to guarantee a valid JSON object
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=WrapperSchema,
                temperature=0.3
            )
        )
        parsed_gemini = json.loads(response.text)
        validated_model = WrapperSchema(**parsed_gemini)
        enriched_data = validated_model.model_dump()
    except Exception as e:
        print(f"GEMINI FAILED: {e}")
        
        # Trigger Ollama fallback for ALL Gemini failures (schema, quota, connection)
        print("Switching to local Ollama...")
        
        try:
                # Use native structured output schema for Ollama
                ollama_schema = WrapperSchema.model_json_schema()
                ollama_raw = await get_ollama_response(prompt, ollama_schema)
                
                # Handle JSON parsing for Ollama
                parsed_data = json.loads(ollama_raw) if isinstance(ollama_raw, str) else ollama_raw
                
                # FIX 1 & 2: Properly unpack into Pydantic, then dump to dictionary
                validated_model = WrapperSchema(**parsed_data)
                enriched_data = validated_model.model_dump()
                
        except Exception as ollama_err:
            print(f"Ollama structured fallback failed: {ollama_err}")
            print(f"Generating rich fallback content for {clean_topic} at {detail_level} detail...")
            enriched_data = await generate_rich_mock_content(clean_topic, dominant_style, current_step, detail_level, custom_query_instruction)
            
    # Final Safety Check - Enforce new schema structure
    if not isinstance(enriched_data, dict) or "style_used" not in enriched_data:
        enriched_data = {
            "style_used": "read_write",
            "content": {
                "type": "read_write",
                "explanation": "Critical fallback error occurred.",
                "bullet_points": ["Both Cloud and Local systems failed to return valid data."],
                "deep_dive_text": "Please restart the server."
            },
            "practice_question": "System completely offline."
        }

    # Dispatch Media Services (e.g. Text-to-Speech)
    if "content" in enriched_data:
        try:
            enriched_data["content"] = await dispatch_media_services(enriched_data["content"], dominant_style)
        except Exception as media_err:
            print(f"Media Dispatch Error: {media_err}")

    result = {
        "topic": clean_topic,
        "response": enriched_data,
        "preferences": prefs
    }
    lessons_collection.update_one(

            {"email": email, "topic": clean_topic},

            {

                "$push": {

                    "steps": {

                        "step": current_step,

                        "content": enriched_data,

                        "modality": dominant_style,

                        "timestamp": datetime.utcnow()

                    }

                },

                "$set": {

                    "detail_level": detail_level,

                    "current_step": current_step,

                    "last_updated": datetime.utcnow(),
                    
                    "domain": domain

                }

            },

            upsert=True

        )

        # 2. Append this event to the user's interactive reading log history

    users_collection.update_one(

            {"email": email},

            {"$addToSet": {

                "learning_log": {

                    "topic": clean_topic,

                    "timestamp": datetime.utcnow(),

                    "action": "lesson_generated"

                }

            }}

        )
    return {"topic": clean_topic, "response": enriched_data}


@router.get("/history/{email:path}")
async def get_history(email: str, topic: str = None):
    # 1. Handle specific topic
    if topic:
        clean_topic = normalize_topic(topic)
        print("t")
        lesson = lessons_collection.find_one({"email": email, "topic": clean_topic})
        if lesson:
            print("l")
            steps = lesson.get("steps", [])
            for step in steps:
                if "_id" in step: step["_id"] = str(step["_id"])
            
            # Fetch additional details for the Topics page
            doubts_cursor = doubts_collection.find({"email": email, "topic": clean_topic})
            doubts = [d.get("doubt") for d in doubts_cursor]
            
            styles_used = list(set([s.get("modality") for s in steps if s.get("modality")]))
            practice_attempts = lesson.get("practice_attempts", [])
            for p in practice_attempts:
                if "timestamp" in p: p["timestamp"] = p["timestamp"].isoformat()
                
            domain = lesson.get("domain", "general")
            
            # --- AI REPORT GENERATION ---
            cached_ai_report = lesson.get("ai_report", {})
            last_report_count = cached_ai_report.get("data_count", 0)
            current_data_count = len(steps) + len(doubts) + len(practice_attempts)
            
            if current_data_count > last_report_count and current_data_count > 0:
                ai_prompt = f"""
You are Modalyn, an empathetic AI tutor.
Analyze the following student data for the topic: {clean_topic}.
Domain: {domain}
Total Steps/Level: {len(steps)}
Learning Styles Used: {styles_used}
Doubts Asked: {doubts}
Practice Attempts: {practice_attempts}

Generate a JSON response with two fields:
1. "weak_areas_report": A brief paragraph analyzing their specific weaknesses based ONLY on the doubts they asked and their incorrect practice answers. Keep it encouraging but analytical.
2. "modalyn_feedback": A personalized, conversational feedback message from you (Modalyn) evaluating their overall progress, how they responded to different learning styles, and advice for next steps.

Respond in EXACTLY this JSON format:
{{
    "weak_areas_report": "string",
    "modalyn_feedback": "string"
}}
"""
                class AIReportSchema(BaseModel):
                    weak_areas_report: str
                    modalyn_feedback: str

                try:
                    ai_res = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=ai_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=AIReportSchema
                        )
                    )
                    report_data = json.loads(ai_res.text)
                except Exception as e:
                    print(f"Gemini failed to generate AI report: {e}. Switching to local Ollama...")
                    try:
                        ollama_raw = await get_ollama_response(ai_prompt, AIReportSchema.model_json_schema())
                        report_data = json.loads(ollama_raw) if isinstance(ollama_raw, str) else ollama_raw
                    except Exception as ollama_err:
                        print(f"Ollama fallback failed: {ollama_err}")
                        report_data = {
                            "weak_areas_report": "Not enough data to analyze weak areas yet, or AI service is temporarily unavailable.",
                            "modalyn_feedback": "You're making progress! Keep completing lessons and practice questions so I can give you personalized feedback."
                        }

                try:
                    cached_ai_report = {
                        "weak_areas_report": report_data.get("weak_areas_report", ""),
                        "modalyn_feedback": report_data.get("modalyn_feedback", ""),
                        "data_count": current_data_count
                    }
                    lessons_collection.update_one(
                        {"email": email, "topic": clean_topic},
                        {"$set": {"ai_report": cached_ai_report}}
                    )
                except Exception as db_err:
                    print(f"Failed to save AI report to DB: {db_err}")
            
            return {
                "steps": steps,
                "domain": domain,
                "doubts": doubts,
                "styles_used": styles_used,
                "practice_attempts": practice_attempts,
                "ai_report": cached_ai_report
            }
        else:
            print("n")
            # Generate new lesson
            new_result = await teach({"email": email, "topic": topic})
            # teach() returns {"topic": ..., "response": {...}}
            return {"steps": [{
                "step": 1,
                "content": new_result["response"],
                "modality": new_result["response"].get("style_used", "read_write")
            }]} 

    # 2. Handle general history
    cursor = lessons_collection.find({"email": email}).sort("last_updated", -1)
    print("hi")
    history = []
    for l in cursor:
        history.append({
            "topic": l.get("topic", "Unknown"),
            "detail_level": l.get("detail_level", "balanced"),
            "level": len(l.get("steps", [])),
            "domain": l.get("domain", "general")
        })
    return {"history": history}
@router.post("/feedback")
async def feedback(data: dict):
    email = data.get("email")
    topic = data.get("topic")
    feedback_status = data.get("feedback")
    text = data.get("text", "")

    user = users_collection.find_one({"email": email})
    if not user:
        return {"error": "User not found"}

    prefs = user.get("teaching_preferences", {})

    current_style = None
    clean_topic = normalize_topic(topic)
    lesson = lessons_collection.find_one({"email": email, "topic": clean_topic})
    if lesson and "steps" in lesson and len(lesson["steps"]) > 0:
        current_style = lesson["steps"][-1].get("style_used")

    if feedback_status == "bad":
        prefs["step_by_step"] = True
        prefs["examples"] = True
        prefs["detail_level"] = "simple"
        if current_style:
            # Penalize current style if they just clicked "bad" and increase struggle score
            users_collection.update_one({"email": email}, {"$inc": {f"learning_style.{current_style}": -3, f"struggle_scores.{clean_topic}": 2}})

    elif feedback_status == "good":
        prefs["detail_level"] = "balanced"
        if current_style:
            users_collection.update_one({"email": email}, {"$inc": {f"learning_style.{current_style}": 2}})

    if feedback_status == "custom" and text:
        prompt = f"""
You are an AI tutor. A student just provided feedback on a lesson that used the '{current_style}' learning style.
Student feedback: "{text}"

1. Does the student explicitly ask for a specific style (visual, reading, kinesthetic, auditory)?
2. Does the student explicitly ask a question or request a specific topic to be taught next? If so, extract exactly what they want into 'custom_query'.

Respond in EXACTLY this JSON format:
{{
  "suggested_style": "visual" | "reading" | "kinesthetic" | "auditory" | "none",
  "dislikes_current_style": true | false,
  "custom_query": "The exact question or topic the user requested, or empty string"
}}
"""
        class FeedbackAnalysis(BaseModel):
            suggested_style: str
            dislikes_current_style: bool
            custom_query: str

        try:
            analysis = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            result = json.loads(analysis.text)
        except Exception as e:
            print(f"GEMINI FAILED: {e}")
            print("Switching to local Ollama...")
            try:
                ollama_raw = await get_ollama_response(prompt, FeedbackAnalysis.model_json_schema())
                result = json.loads(ollama_raw) if isinstance(ollama_raw, str) else ollama_raw
            except Exception as ollama_e:
                print(f"Ollama failed: {ollama_e}")
                result = {"suggested_style": "none", "dislikes_current_style": False, "custom_query": text}

        suggested = result.get("suggested_style", "none").lower()
        dislikes = result.get("dislikes_current_style", False)
        custom_query = result.get("custom_query", "").strip()

        updates = {}
        if dislikes and current_style:
            updates[f"learning_style.{current_style}"] = -5 # Heavily penalize current style
        
        if suggested in ["visual", "reading", "kinesthetic", "auditory"]:
            updates[f"learning_style.{suggested}"] = 5 # Boost new style
            
        if updates:
            users_collection.update_one({"email": email}, {"$inc": updates})
            
        if custom_query:
            users_collection.update_one({"email": email}, {
                "$set": {"teaching_preferences.next_instruction": custom_query},
                "$inc": {f"struggle_scores.{clean_topic}": 1}
            })
            doubts_collection.insert_one({
                "email": email,
                "topic": clean_topic,
                "doubt": custom_query,
                "timestamp": datetime.utcnow()
            })

    return {"message": "Feedback saved", "updated_preferences": prefs}

@router.post("/practice-check")
async def practice_check(data: dict):
    email = data.get("email")
    topic = data.get("topic")
    clean_topic = normalize_topic(topic) if topic else "unknown"
    question = data.get("question")
    answer = data.get("answer")

    # Fetch current lesson to know what style they just failed
    lesson = lessons_collection.find_one({"email": email, "topic": clean_topic})
    current_style = "reading" # default
    if lesson and "steps" in lesson and len(lesson["steps"]) > 0:
        current_style = lesson["steps"][-1].get("modality", "reading")

    prompt = f"""
    You are an AI tutor evaluating a student's answer.
    Topic: {clean_topic}
    Question: {question}
    Student Answer: {answer}

    YOUR OUTPUT MUST BE A SINGLE JSON OBJECT WITH EXACTLY THIS STRUCTURE:
    {{
        "correct": true/false,
        "feedback": "Explain why they are right or wrong.",
        "improved_answer": "Provide a model answer."
    }}
    """

    class PracticeSchema(BaseModel):
        correct: bool
        feedback: str
        improved_answer: str

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PracticeSchema
            )
        )
        result = json.loads(response.text)
    except Exception as e:
        print(f"GEMINI FAILED: {e}")
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower():
            print("Quota exhausted! Switching to local Ollama...")
            try:
                # Use native structured output schema for Ollama
                response_dict = await get_ollama_response(prompt, PracticeSchema.model_json_schema())
                
                # get_ollama_response returns a dict already (or string needing load)
                if isinstance(response_dict, str):
                    response_dict = json.loads(response_dict)
                    
                validated = PracticeSchema(**response_dict)
                return validated.model_dump()
            except Exception as ollama_err:
                print(f"Ollama failed: {ollama_err}")
                return {"correct": False, "feedback": "System offline.", "improved_answer": ""}
        result = {"correct": False, "feedback": "System offline.", "improved_answer": ""}


    # --- THE MAGIC HAPPENS HERE: STATE TRACKING ---
    attempt_record = {
        "question": question,
        "answer": answer,
        "correct": result.get("correct"),
        "feedback": result.get("feedback"),
        "improved_answer": result.get("improved_answer"),
        "timestamp": datetime.utcnow()
    }
    
    if result.get("correct") == True:
        # User passed! Clear any re-teach flags so the next step advances.
        lessons_collection.update_one(
            {"email": email, "topic": clean_topic},
            {"$set": {"needs_reteach": False}, "$unset": {"failed_style": ""}, "$push": {"practice_attempts": attempt_record}}
        )
    else:
        # User failed! Flag for re-teach and temporarily penalize the style that didn't work.
        lessons_collection.update_one(
            {"email": email, "topic": clean_topic},
            {"$set": {"needs_reteach": True, "failed_style": current_style}, "$push": {"practice_attempts": attempt_record}}
        )
        # Drop the weight of the style that failed and increment struggle score
        users_collection.update_one(
            {"email": email}, 
            {"$inc": {f"learning_style.{current_style}": -2, f"struggle_scores.{clean_topic}": 1}}
        )

    return result
        
@router.post("/add-step")
async def add_next_step(data: dict):
    email = data.get("email")
    topic = data.get("topic")
    clean_topic = normalize_topic(topic) if topic else ""
    step_data = data.get("step_data")

    db.user_progress.update_one(
        {"email": email, "topic": clean_topic},
        {
            "$push": {"history": step_data},
            "$inc": {"current_step": 1} 
        },
        upsert=True
    )
    return {"status": "success"}