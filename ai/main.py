from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Ollama 서버 주소 및 사용할 AI 모델 환경변수로 관리
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")
OLLAMA_MODELS = [m.strip() for m in os.getenv("OLLAMA_MODELS", OLLAMA_MODEL).split(",")]


# /generate-tasks 용 요청 구조 (프로젝트 제목 + 설명)
class TaskGenerateRequest(BaseModel):
    description: str
    model: str | None = None


# /subdivide-task 용 요청 구조 (단일 업무 + 카테고리)
class SubdivideRequest(BaseModel):
    task: str
    category: str
    model: str | None = None


# AI가 생성하는 업무 카드 한 개
class Task(BaseModel):
    title: str
    description: str
    category: str           # 기획 / 디자인 / 프론트 / 백엔드 / 테스트
    priority: str = "MEDIUM"  # HIGH / MEDIUM / LOW
    estimated_hours: int | None = None


# /generate-tasks 응답 구조 (업무 카드 목록)
class TaskGenerateResponse(BaseModel):
    tasks: list[Task]


# /subdivide-task 응답 구조 (세부 업무 이름 목록)
class SubdivideResponse(BaseModel):
    tasks: list[str]


def _extract_json(text: str) -> dict:
    # AI가 ```json ... ``` 형태로 응답하는 경우 코드블록 안만 추출
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block:
        text = code_block.group(1)

    # { } 깊이를 추적해서 가장 바깥 JSON 객체 추출
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


def _build_subdivide_prompt(task: str, category: str) -> str:
    return f"""You are a task breakdown AI. Split the following task into exactly 2 distinct subtasks.

[Task]
Name: {task}
Category: {category}

Rules:
- Split into EXACTLY 2 subtasks.                                                                                               # 반드시 2개
- Each subtask must be meaningfully different from the other (not just numbered variants of the same action).                  # 비슷한 거 2개 금지
- One subtask should focus on preparation or planning (e.g. research, design, setup), the other on execution or implementation. # 준비 하나, 실행 하나
- If the task cannot be meaningfully split, return an empty tasks array.                                                       # 분해 불가 시 빈 배열
- Write task names in Korean. Technical terms (API, UI/UX, etc.) may stay in English.                                         # 한국어 출력
- Keep each subtask name concise (under 20 characters).                                                                       # 20자 이하

Respond with ONLY the following JSON and nothing else:
{{"tasks": ["subtask1", "subtask2"]}}"""


def _build_generate_prompt(description: str) -> str:
    # AI에게 보낼 업무 분해 프롬프트 생성
    # 영어로 작성한 이유: 오픈소스 모델은 영어 지시를 더 정확하게 따름
    return f"""You are a project task breakdown AI. Analyze the project below and break it down into specific, implementation-level tasks.

[Project]
Description: {description}

Rules:
- Generate between 8 and 15 tasks. NEVER generate fewer than 8.                                                                                                                           # 태스크 최소 8개, 최대 15개
- Each task must name a SPECIFIC feature, screen, or component — never a broad area.                                                                                                      # 구체적 기능 단위 필수
- BAD (too broad): "API 개발", "DB 설계", "프론트엔드 구현", "백엔드 작업"                                                                                                                 # 이런 넓은 표현 금지
- GOOD (specific): "로그인/회원가입 API 구현", "칸반 카드 드래그앤드롭 구현", "JWT 인증 미들웨어 작성", "사용자 테이블 ERD 설계"                                                              # 이 정도 구체성 필요
- Cover different technical layers of the project (UI, API, DB, auth, testing, etc.). Spread tasks evenly — do NOT cluster everything in one layer.                                       # UI/API/DB 등 레이어 고루 배분
- Each task should be independent enough for one person to pick up and complete.                                                                                                           # 1인 단독 수행 가능
- Set priority to HIGH, MEDIUM, or LOW based on importance and urgency.                                                                                                                    # 중요도/긴급도 기준 우선순위
- Estimate hours as a positive integer between 1 and 16 (realistic working hours for one person).                                                                                          # 시간 추정 1~16시간
- Do NOT assign tasks to anyone.                                                                                                                                                            # 담당자 지정 금지
- Infer 4 to 6 category names from the project domain (e.g. 기획, 프론트엔드, 백엔드, DB, 테스트, 배포). Do NOT use vague names like "제작" or "작업".                                      # 카테고리 4~6개, 구체적 이름
- Write all task titles and descriptions in Korean. Technical terms (API, UI/UX, DB, JWT, REST, etc.) may stay in English.                                                                 # 한국어 출력
- Keep each task title concise (under 20 characters).                                                                                                                                      # title 20자 이하
- Keep each task description concise (under 60 characters).                                                                                                                                # description 60자 이하

Respond with ONLY the following JSON and nothing else:
{{
  "tasks": [
    {{
      "title": "task title",
      "description": "what needs to be done",
      "category": "카테고리명",
      "priority": "HIGH",
      "estimated_hours": 4
    }}
  ]
}}"""


# 서버 상태 확인 (Docker healthcheck 등에서 사용)
@app.get("/health")
def health():
    return {"status": "ok"}


# 사용 가능한 AI 모델 목록 반환
@app.get("/models")
def models():
    return {"models": OLLAMA_MODELS, "default": OLLAMA_MODEL}



# 단일 업무 → 2개 세부 업무로 분해
@app.post("/subdivide-task", response_model=SubdivideResponse)
async def subdivide_task(req: SubdivideRequest):
    model = req.model or OLLAMA_MODEL
    if model not in OLLAMA_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}",
        )

    prompt = _build_subdivide_prompt(req.task, req.category)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 200, "temperature": 0.3},
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
        subtasks = parsed.get("tasks", [])
        if not isinstance(subtasks, list):
            raise ValueError("tasks가 배열이 아닙니다.")
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=422,
            detail=f"AI 응답 파싱 실패: {e}\n원문: {raw_text[:300]}",
        )

    return SubdivideResponse(tasks=[str(t) for t in subtasks])


# 프로젝트 정보 → 업무 카드 목록 반환 (장바구니 핵심 기능)
# 팀장이 제목+설명 입력 → AI가 8~15개 업무로 분해 → 팀원이 드래그해서 가져감
@app.post("/generate-tasks", response_model=TaskGenerateResponse)
async def generate_tasks(req: TaskGenerateRequest):
    model = req.model or OLLAMA_MODEL
    if model not in OLLAMA_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 모델: {model}. 사용 가능: {OLLAMA_MODELS}",
        )

    prompt = _build_generate_prompt(req.description)

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 4000, "temperature": 0.3},
                    # num_predict: 8~15개 태스크 생성에 충분한 토큰 수 (2500→4000)
                    # temperature: 낮을수록 일관된 JSON 출력
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

    # AI 응답에서 JSON 추출 및 파싱
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

    # dict 목록 → Task 객체 목록 변환
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
