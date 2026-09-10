from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import os
import re
from groq import Groq

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

SYSTEM_PROMPT = """You are FareCurve AI, an advanced, highly specialized aviation data and pricing analyst assistant built specifically for the Government of India (DGCA, NSO, and RBI).

CORE DIRECTIVES:
1. You analyze real-time airfare scraping data (the FareCurve Index).
2. Your primary goal is to help policymakers understand dynamic pricing, inflation trends, fuel (ATF) impacts, and OTA (MakeMyTrip, Goibibo) surcharges.
3. Be professional, deeply analytical, and highly structured in your responses. Use bullet points and clear, concise language.
4. If asked about the Consumer Price Index (CPI), explain that FareCurve provides high-frequency APIx (Airfare Price Index) data to augment the traditional CPI basket.
5. If asked about anomalies, explain that you detect price surges, phantom flights, and deceptive pricing tactics by OTAs.

TONE:
Professional, data-driven, governmental, and insightful. You speak with authority on Indian aviation."""

# Models to try in order of preference
MODELS = [
    "allam-2-7b",
    "qwen/qwen3.6-27b",
]

@router.post("/ai/chat")
async def chat_endpoint(request: ChatRequest):
    load_dotenv(r'C:\AIR-INDEX\.env')
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured in environment.")

    client = Groq(api_key=api_key)
    
    groq_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.messages:
        groq_messages.append({"role": msg.role, "content": msg.content})

    last_error = None
    for model in MODELS:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=groq_messages,
                temperature=0.7,
                max_tokens=900,
                top_p=1,
                stream=False,
                stop=None,
            )

            response_content = completion.choices[0].message.content
            # Strip <think>...</think> reasoning tags from Qwen-family models
            response_content = re.sub(r'<think>.*?</think>', '', response_content, flags=re.DOTALL).strip()
            if response_content:
                return {"content": response_content}
            else:
                last_error = f"Empty response from {model}"
                continue
        except Exception as e:
            last_error = str(e)
            print(f"Groq API Error with {model}: {last_error}")
            continue

    raise HTTPException(status_code=500, detail=f"All models failed. Last error: {last_error}")
