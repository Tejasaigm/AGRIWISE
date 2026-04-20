"""
POST /api/chatbot
Hybrid AI Chatbot: Rule-based + LLM (Claude) fallback
Context-aware agriculture assistant
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import List, Optional
import re
import logging
import httpx
import os

router = APIRouter()
logger = logging.getLogger(__name__)

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL   = "claude-sonnet-4-20250514"

# ─── Rule-based knowledge base ────────────────────────────────────────────────
RULE_KB = {
    # Soil & fertilizers
    r"(npk|nitrogen|phosphorus|potassium|fertiliz)": {
        "answer": "For balanced crop growth use NPK 20-20-20 as base fertilizer. Apply Urea (46% N) for nitrogen top-up. DAP provides phosphorus and nitrogen. MOP provides potassium. Always soil-test before applying.",
        "category": "soil"
    },
    r"(ph|acidic|alkaline|lime|gypsum)": {
        "answer": "Ideal soil pH for most crops: 6.0–7.0. To raise pH (acidic soil): add agricultural lime (CaCO3) at 2–4 tons/acre. To lower pH (alkaline soil): add gypsum or sulfur. Retest after 6 weeks.",
        "category": "soil"
    },
    r"(organic|compost|manure|vermi)": {
        "answer": "Farmyard manure (FYM) improves soil structure. Apply 5–10 tons/acre before sowing. Vermicompost (2–3 tons/acre) improves microbial activity. Green manuring with Dhaincha or Sunhemp fixes nitrogen naturally.",
        "category": "soil"
    },
    # Irrigation
    r"(irrigation|watering|drip|sprinkler|flood|moisture)": {
        "answer": "Drip irrigation saves 40–60% water vs flood. For vegetables: irrigate when top 2–3 inches of soil are dry. Critical irrigation stages: flowering and grain fill. Avoid waterlogging – ensure field drainage.",
        "category": "irrigation"
    },
    # Pest management
    r"(pest|insect|aphid|whitefly|thrip|mite|borer|locust)": {
        "answer": "Use Integrated Pest Management (IPM): 1) Yellow sticky traps for whiteflies/aphids. 2) Neem oil (3–5ml/L) as organic control. 3) Imidacloprid 17.8 SL for sucking pests. 4) Chlorpyrifos for soil borers. Spray early morning or evening.",
        "category": "pest"
    },
    r"(fungus|blight|rot|mildew|rust|wilt|anthracnose)": {
        "answer": "For fungal diseases: use copper-based fungicides (Bordeaux mixture) preventively. Mancozeb 75 WP (2.5g/L) is broad-spectrum. Metalaxyl for soil-borne fungi. Remove infected plant material and burn. Avoid overhead irrigation.",
        "category": "disease"
    },
    # Crop-specific
    r"(rice|paddy)": {
        "answer": "Rice requires: pH 5.5–7.0, temperature 20–35°C, rainfall >150mm. Apply 120:60:60 kg/ha NPK. Transplant at 25 days age. Critical water: active tillering and panicle initiation. Harvest when 80% grains turn golden.",
        "category": "crop"
    },
    r"(wheat|gehun)": {
        "answer": "Wheat: sow November–December (Rabi). pH 6.0–7.5. Apply 120:60:40 NPK kg/ha. Irrigate at CRI (21 days), tillering, jointing, heading, and grain fill stages. Harvest when moisture <14%.",
        "category": "crop"
    },
    r"(tomato|tamatar)": {
        "answer": "Tomato: pH 6.0–7.0, warm days (22–30°C), cool nights. Space 60×45cm. Apply 120:60:60 NPK. Stake plants at 30cm height. Watch for leaf curl virus (whitefly) and early blight. Harvest at 75–80% color.",
        "category": "crop"
    },
    r"(cotton|kapas)": {
        "answer": "Cotton: pH 6.0–8.0, temperature 25–35°C. Sow June–July (Kharif). Apply 120:60:60 NPK kg/ha. Critical: boll development stage needs adequate water. Use Bollguard BT varieties. Harvest at 140–180 days.",
        "category": "crop"
    },
    # Market & price
    r"(price|mandi|market|sell|rate|apmc)": {
        "answer": "Check current mandi rates on agmarknet.gov.in or eNAM (National Agriculture Market). Sell through FPOs for better collective bargaining. Time your sale 2–4 weeks after peak harvest to get better prices.",
        "category": "market"
    },
    r"(loan|credit|kcc|pm.?kisan|subsidy|insurance|pmfby)": {
        "answer": "Kisan Credit Card (KCC): up to ₹3 lakh at 4% interest (with timely repayment). PM-KISAN: ₹6,000/year direct benefit. PMFBY crop insurance: premium 2% Kharif, 1.5% Rabi. Apply through nearest bank or CSC center.",
        "category": "finance"
    },
    # Weather
    r"(weather|rain|forecast|drought|flood|storm)": {
        "answer": "Monitor weather at IMD (mausam.imd.gov.in) or Meghdoot app. For drought: switch to drip irrigation, mulching, and drought-tolerant varieties. For flood risk: ensure field drains are open and earthen bunds are intact.",
        "category": "weather"
    },
    # Seeds
    r"(seed|variety|hybrid|sowing|germination)": {
        "answer": "Use certified seeds from government depots or NSC. Treat seeds with Thiram (2.5g/kg) for fungi and Imidacloprid (5ml/kg) for soil insects before sowing. Seed rate and spacing vary by crop – consult Krishi Vigyan Kendra (KVK).",
        "category": "seed"
    },
}

# ─── Request/Response models ───────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

    @validator("role")
    def validate_role(cls, v):
        if v not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return v

    @validator("content")
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("content cannot be empty")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 chars)")
        return v.strip()


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: Optional[str] = "en"  # "en" | "hi" | "te"

    @validator("message")
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("message is required")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 chars)")
        return v.strip()

    @validator("language")
    def validate_language(cls, v):
        if v not in ("en", "hi", "te"):
            return "en"
        return v

    @validator("history")
    def validate_history(cls, v):
        if v and len(v) > 20:
            return v[-20:]  # keep last 20 messages
        return v or []


# ─── Rule-based matching ───────────────────────────────────────────────────────

def rule_match(message: str) -> Optional[dict]:
    msg_lower = message.lower()
    for pattern, response in RULE_KB.items():
        if re.search(pattern, msg_lower, re.IGNORECASE):
            return response
    return None


# ─── LLM fallback ─────────────────────────────────────────────────────────────

async def llm_response(message: str, history: List[ChatMessage], language: str) -> str:
    lang_instruction = {
        "hi": "Respond only in Hindi (Devanagari). Keep your answer practical and easy to understand.",
        "te": "Respond only in Telugu script. Keep your answer practical and easy to understand.",
        "en": "",
    }.get(language, "")

    system_prompt = f"""You are AgriWise AI, an expert agriculture assistant for Indian farmers.
Your role: provide accurate, practical advice on crop management, soil health, pest control, 
irrigation, market prices, government schemes, and post-harvest handling.
Be concise (3–5 sentences), factual, and farmer-friendly. 
If you don't know something, say so. Never give harmful or incorrect chemical dosages.
{lang_instruction}""".strip()

    messages = []
    for h in history[-6:]:  # last 6 turns for context
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    if not CLAUDE_API_KEY:
        return "LLM service is not configured. Please set ANTHROPIC_API_KEY."

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 400,
                    "system": system_prompt,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
    except httpx.TimeoutException:
        return "Response timed out. Please try again."
    except Exception as e:
        logger.error(f"LLM error: {e}")
        return "I'm having trouble connecting to the AI service right now. Please try again."


# ─── API Endpoint ─────────────────────────────────────────────────────────────

@router.post("/chatbot")
async def chatbot(req: ChatRequest):
    """
    Hybrid Agriculture Chatbot
    1. Rule-based matching (fast, deterministic)
    2. LLM fallback (Claude Sonnet) if no rule matches
    Multi-language: en / hi / te
    """
    message  = req.message
    language = req.language
    source   = "rule_based"

    # Try rule-based first
    rule = rule_match(message)
    if rule:
        answer = rule["answer"]
        category = rule["category"]
    else:
        # LLM fallback
        answer   = await llm_response(message, req.history, language)
        category = "general"
        source   = "llm"

    return JSONResponse(content={
        "answer":   answer,
        "category": category,
        "source":   source,
        "language": language,
    }, status_code=200)
