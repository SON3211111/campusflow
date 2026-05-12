from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")
OLLAMA_MODELS = [m.strip() for m in os.getenv("OLLAMA_MODELS", OLLAMA_MODEL).split(",")]


class PromptRequest(BaseModel):
    prompt: str
    model: str | None = None


class TaskGenerateRequest(BaseModel):
    title: str
    description: str
    model: str | None = None


class Task(BaseModel):
    title: str
    description: str
    category: str           # 디자인 / 프론트 / 백엔드 / 테스트 / 기획
    priority: str = "MEDIUM"
    estimated_hours: int | None = None


class TaskGenerateResponse(BaseModel):
    tasks: list[Task]


def _extract_json(text: str) -> dict:
    # 마크다운 코드블록이 있으면 내용만 추출 후 depth 방식으로 파싱
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block:
        text = code_block.group(1)

    # 중첩 괄호 추적으로 가장 바깥 {} 추출
    start = text.find("{")
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(text[start : i + 1])

    raise ValueError("JSON을 찾을 수 없습니다.")


def _build_generate_prompt(title: str, description: str) -> str:
    return f"""You are a project task breakdown AI. Analyze the project below and break it down into concrete tasks.

[Project]
Title: {title}
Description: {description}

Rules:
- Break the project into 4 to 8 concrete, actionable tasks.
- Each task should be independent enough for one person to pick up and work on.
- Set priority to HIGH, MEDIUM, or LOW based on importance and urgency.
- Estimate hours as a positive integer (realistic working hours for one person).
- Do NOT assign tasks to anyone. Tasks will be claimed by team members themselves.
- Set category to ONE of: 기획, 디자인, 프론트, 백엔드, 테스트

Respond with ONLY the following JSON and nothing else:
{{
  "tasks": [
    {{
      "title": "task title",
      "description": "what needs to be done",
      "category": "백엔드",
      "priority": "HIGH",
      "estimated_hours": 4
    }}
  ]
}}"""


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
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}",
        )

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": req.prompt,
                    "stream": False,
                    "options": {"num_predict": 200},
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


@app.post("/generate-tasks", response_model=TaskGenerateResponse)
async def generate_tasks(req: TaskGenerateRequest):
    model = req.model or OLLAMA_MODEL
    if model not in OLLAMA_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}",
        )

    prompt = _build_generate_prompt(req.title, req.description)

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 1200, "temperature": 0.3},
                },
            )
            response.raise_for_status()
            raw_text = response.json().get("response", "")

        except httpx.HTTPError as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=502, detail=repr(e))
        except Exception as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=repr(e))

    try:
        parsed = _extract_json(raw_text)
        tasks_data = parsed.get("tasks", [])
        if not tasks_data:
            raise ValueError("tasks 배열이 비어 있습니다.")
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=422,
            detail=f"AI 응답 파싱 실패: {e}\n원문: {raw_text[:500]}",
        )

    tasks = [
        Task(
            title=t.get("title", ""),
            description=t.get("description", ""),
            category=t.get("category", "기타"),
            priority=t.get("priority", "MEDIUM").upper(),
            estimated_hours=t.get("estimated_hours"),
        )
        for t in tasks_data
    ]

    return TaskGenerateResponse(tasks=tasks)
