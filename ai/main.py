from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_MODELS = [m.strip() for m in os.getenv("OLLAMA_MODELS", OLLAMA_MODEL).split(",")]


class PromptRequest(BaseModel):
    prompt: str
    model: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/models")
def models():
    return {"models": OLLAMA_MODELS, "default": OLLAMA_MODEL}


@app.post("/generate")
async def generate(req: PromptRequest):
    model = req.model or OLLAMA_MODEL
    if model not in OLLAMA_MODELS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": req.prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=str(e))
