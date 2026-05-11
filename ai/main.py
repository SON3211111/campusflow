from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")        # 기본 모델 변경
OLLAMA_MODELS = [m.strip() for m in os.getenv("OLLAMA_MODELS", OLLAMA_MODEL).split(",")]


class PromptRequest(BaseModel):
    prompt: str
    model: str | None = None   # 모델 선택 (없으면 기본값)


@app.get("/health")
def health():
    return {"status": "ok"}    # 서버 상태 확인


@app.get("/models")
def models():
    return {"models": OLLAMA_MODELS, "default": OLLAMA_MODEL}  # 모델 목록


@app.post("/generate")
async def generate(req: PromptRequest):
    model = req.model or OLLAMA_MODEL   # 모델 선택 없으면 기본값
    if model not in OLLAMA_MODELS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}")

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": req.prompt,
                    "stream": False,
                    "options": {"num_predict": 200}
                },
            )
            response.raise_for_status()
            data = response.json()

            return {"result": data.get("response", "")}

        except httpx.HTTPError as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=502, detail=repr(e))
        except Exception as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=repr(e))