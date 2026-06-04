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


# 세부 분할된 서브태스크 하나
class SubdivideTask(BaseModel):
    title: str
    description: str

# /subdivide-task 응답 구조 (세부 업무 목록)
class SubdivideResponse(BaseModel):
    tasks: list[SubdivideTask]


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
    # ── 세부 분할(subdivide) 프롬프트 ────────────────────────────────────────
    # 사용자가 카드 하나를 "세부 분할" 버튼으로 쪼갤 때 호출된다.
    # 반드시 2개로만 분할: "준비/조사" 하나 + "실행/제작" 하나.
    # 더 이상 쪼갤 수 없는 태스크(e.g. "회의 날짜 잡기")는 빈 배열 반환.
    # ─────────────────────────────────────────────────────────────────────────
    return f"""You are a university team project task breakdown AI.
Split the following task into exactly 2 distinct subtasks.

[Task]
Name: {task}
Category: {category}

Rules:
- Split into EXACTLY 2 subtasks.
# 반드시 2개. 3개 이상 또는 1개 출력 금지.

- Each subtask must be meaningfully different.
# 단순히 번호만 다른 변형(e.g. "조사 1", "조사 2") 금지.
# 두 서브태스크가 실질적으로 다른 작업이어야 한다.

- One subtask = preparation/research/planning, the other = execution/implementation/production.
# 준비(조사·설계·기획) 1개 + 실행(제작·구현·작성) 1개 구조를 권장.
# 예시:
#   원본: "사용자 인터뷰 준비 및 진행"
#   → 준비: "인터뷰 질문지 작성 (10문항, 반구조화)"
#   → 실행: "대상자 5명 인터뷰 진행 및 녹취 정리"
#
#   원본: "로그인 API 구현"
#   → 준비: "JWT 인증 흐름 설계 및 DB 스키마 확정"
#   → 실행: "로그인·로그아웃 엔드포인트 구현 및 테스트"
#
#   원본: "보고서 서론 작성"
#   → 준비: "서론에 인용할 선행연구 3건 선정 및 요약"
#   → 실행: "서론 초안 작성 (A4 1.5장, 연구 배경·목적 포함)"

- If the task is too atomic to split meaningfully, return an empty tasks array.
# 더 쪼개면 의미없는 단위가 되는 태스크는 빈 배열 반환.
# 예: "팀 채팅방 개설", "제출 파일 압축", "날짜 조율"

- Write in Korean. Technical terms (API, Figma, JWT, etc.) may stay in English.
# 한국어 출력 원칙. 기술 용어는 영어 허용.

- Title: under 20 characters.
- Description: must add NEW info (method/scope/condition) not in the title. Under 60 characters.
# description은 title 반복 금지. 구체적 방법·범위·조건을 추가해야 한다.

Respond with ONLY the following JSON and nothing else:
{{"tasks": [{{"title": "서브태스크1", "description": "구체적 방법/범위/조건"}}, {{"title": "서브태스크2", "description": "구체적 방법/범위/조건"}}]}}"""


def _build_generate_prompt(description: str) -> str:
    # ── 왜 영어로 작성하는가 ──────────────────────────────────────────────────
    # qwen2.5 같은 오픈소스 모델은 영어 지시문을 훨씬 더 정확히 따른다.
    # 한국어 지시문으로 바꾸면 JSON 포맷을 어기거나 규칙을 무시하는 경우가 많았음.
    # 출력(태스크 제목/설명)은 한국어로 강제하되, 지시문 자체는 영어 유지.
    # ─────────────────────────────────────────────────────────────────────────
    return f"""You are a university team project task breakdown AI.
Your job is to help college students split their team assignment into clear, assignable tasks.

[Project / Assignment]
Description: {description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — IDENTIFY THE DOMAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 입력 설명에서 도메인을 먼저 파악한다.
# 대학 과제 도메인은 크게 아래와 같이 나뉜다:
#   - software_dev    : 앱/웹/서버 개발, 캡스톤 디자인(개발)
#   - academic_report : 팀 레포트, 논문, 조사 보고서
#   - presentation    : 발표 과제, 세미나, PT 준비
#   - design_ux       : UI/UX 디자인, 영상, 포스터, 콘텐츠 제작
#   - engineering     : 회로/기계/건축 설계·제작 과제
#   - marketing_biz   : 마케팅 기획, 비즈니스 플랜, 창업 과제
#   - event_planning  : 학교 행사, 동아리 기획, 축제
#   - research_science: 실험·데이터 분석, 자연과학 연구
#   - other           : 위에 해당 없는 경우
# 도메인을 잘못 판단하면 태스크가 엉뚱해지므로 반드시 먼저 파악할 것.

First, silently identify the domain from the description above.
Do NOT output the domain — just use it to guide task generation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — GENERATE TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK COUNT
- Generate between 8 and 15 tasks. NEVER fewer than 8.
# 태스크가 너무 적으면 팀원이 역할을 나눌 수 없다.
# 입력이 짧아도 도메인에서 당연히 필요한 단계들을 추론해서 8개를 채울 것.

SPECIFICITY — most important rule
- Each task must name ONE specific deliverable or action.
# "자료 수집"처럼 넓은 영역 이름은 절대 금지.
# 한 사람이 받아서 바로 시작할 수 있을 정도로 구체적이어야 한다.
- BAD (too vague)  → "자료 수집", "개발", "디자인 작업", "발표 준비", "보고서 작성"
- GOOD (specific)  → 각 도메인 예시 참고 (아래)

DOMAIN EXAMPLES — adapt these to the actual domain, do NOT copy blindly
# 소프트웨어 개발 과제
  Software dev:
    BAD  "API 개발"             GOOD "로그인·회원가입 REST API 구현 (JWT 발급 포함)"
    BAD  "프론트엔드 작업"      GOOD "메인 대시보드 React 컴포넌트 구현"
    BAD  "DB 설계"              GOOD "사용자·게시글·댓글 3개 테이블 ERD 작성"
    BAD  "테스트"               GOOD "서비스 레이어 JUnit5 단위 테스트 작성"

# 팀 레포트 / 논문 과제
  Academic report:
    BAD  "자료 조사"            GOOD "MZ세대 소비 트렌드 통계 자료 5건 이상 수집"
    BAD  "보고서 작성"          GOOD "서론·이론적 배경 섹션 초안 작성 (A4 3장)"
    BAD  "편집"                 GOOD "전체 보고서 양식 통일 및 참고문헌 APA 형식 정리"
    BAD  "발표자료 만들기"       GOOD "핵심 내용 요약 슬라이드 10장 제작 (Canva)"

# 발표 과제
  Presentation:
    BAD  "발표 준비"            GOOD "발표 스크립트 작성 (파트별 2분 분량)"
    BAD  "슬라이드 제작"        GOOD "시각자료 포함 슬라이드 20장 디자인"
    BAD  "리허설"               GOOD "전체 발표 리허설 1회 진행 및 피드백 반영"
    BAD  "Q&A 준비"             GOOD "예상 질문 10개 목록화 및 답변 초안 작성"

# UI/UX 디자인 과제
  Design/UX:
    BAD  "디자인"               GOOD "사용자 인터뷰 5명 진행 및 Pain Point 정리"
    BAD  "와이어프레임"         GOOD "Figma로 주요 화면 6개 로우파이 와이어프레임 작성"
    BAD  "프로토타입"           GOOD "Figma 인터랙티브 프로토타입 제작 및 클릭 테스트"
    BAD  "최종 디자인"          GOOD "디자인 시스템 컬러·타이포 가이드라인 문서 작성"

# 공학 설계·제작 과제
  Engineering:
    BAD  "설계"                 GOOD "회로 개략도(schematic) AutoCAD 작성"
    BAD  "제작"                 GOOD "PCB 보드 납땜 및 초기 통전 테스트"
    BAD  "실험"                 GOOD "부하 조건 3가지 변경하며 전압·전류 측정 기록"

# 마케팅·비즈니스 과제
  Marketing/Biz:
    BAD  "시장 조사"            GOOD "경쟁사 3곳 서비스 비교 분석표 작성"
    BAD  "마케팅 전략"          GOOD "SNS 채널별 콘텐츠 캘린더 4주치 기획"
    BAD  "사업계획서 작성"      GOOD "재무 추정표 (3년치 손익계산서) 엑셀 작성"

# 행사·이벤트 기획
  Event planning:
    BAD  "행사 준비"            GOOD "행사장 3곳 비교 견적 후 대관 예약 완료"
    BAD  "홍보"                 GOOD "인스타그램·에브리타임 홍보 게시물 3종 제작"
    BAD  "진행"                 GOOD "당일 타임테이블 및 역할 분담표 최종 확정"

# 실험·데이터 분석
  Research/Science:
    BAD  "실험"                 GOOD "대조군·실험군 설정 후 3회 반복 측정 실시"
    BAD  "데이터 분석"          GOOD "수집 데이터 Python pandas로 기술통계 분석"
    BAD  "결과 정리"            GOOD "분석 결과 시각화 그래프 5개 작성 (matplotlib)"

COVERAGE — spread tasks across the full lifecycle
# 도메인에 맞는 전체 흐름을 고루 커버해야 한다.
# 예: 레포트라면 "조사 → 아웃라인 → 초안 → 검토 → 편집 → 제출 준비" 단계가 모두 나와야 함.
# 구현 태스크만 잔뜩 나오거나 계획 태스크만 나오면 안 됨.

ORDER — logical execution sequence
# 반드시 실행 순서대로 정렬: 조사/기획 → 설계/준비 → 제작/구현 → 검토/테스트 → 마무리/제출
- Planning and research first, then design/setup, then implementation, then review/testing, then wrap-up last.

NO DUPLICATES
- Each task must have a clearly distinct purpose.
# 비슷한 태스크 2개가 나오면 하나로 합치거나 약한 쪽을 버린다.

PRIORITY
- Set priority HIGH / MEDIUM / LOW. Assign HIGH to at most 30% of tasks.
# HIGH 남발 금지. 마감에 직결되거나 다른 태스크의 블로커인 것만 HIGH.

ESTIMATED HOURS — domain-aware guide
# 개발 과제가 아닌 경우 시간 추정 기준이 다르므로 도메인에 맞게 판단할 것.
- 1~2h  : 짧은 조사, 간단한 문서 정리, 회의 준비
- 3~5h  : 자료 조사 및 정리, 슬라이드 초안, 단순 코드 기능 1개
- 6~10h : 보고서 섹션 작성, 화면 구현 1개, 실험 설계 및 1회 수행
- 11~20h: 전체 보고서 초안, 복잡한 기능 구현, 대규모 데이터 분석
- estimatedHours MUST be a positive integer. NEVER output null.
# null이 나오면 프론트엔드에서 오류가 발생하므로 반드시 숫자로 출력.

CATEGORIES
- Infer 4 to 6 category names that reflect the actual work areas of this project.
# 카테고리는 도메인에서 자연스럽게 나오는 작업 영역 이름이어야 한다.
# 소프트웨어: "기획", "백엔드", "프론트엔드", "테스트/배포"
# 레포트: "자료조사", "집필", "편집/검토", "발표준비"
# 행사: "기획", "홍보", "운영준비", "당일진행"
# "기타", "작업", "업무" 같은 뭉뚱그린 이름은 절대 사용 금지.
- Do NOT use vague category names like "작업", "기타", "업무", "misc".

LANGUAGE
- Write all task titles and descriptions in Korean. Technical terms (API, UI/UX, ERD, etc.) may stay in English.
# 한국어 출력이 원칙. 단, 기술 용어(API, Figma, Git, ERD 등)는 영어 그대로 사용 가능.
- NEVER mix Korean and English within a single word.
# 단어 중간에 한영 혼합 절대 금지.
# BAD: "프론트END", "데이터BASE", "인TEGRATION"
# GOOD: "프론트엔드", "데이터베이스", "Integration Test"

TITLE LENGTH  : under 25 characters
DESCRIPTION RULE:
- Must add SPECIFIC information NOT already in the title.
# description은 title을 반복하면 안 된다. 새로운 정보(방법/범위/조건)를 추가해야 한다.
- Must answer one of: HOW (method/tool used), WHAT EXACTLY (scope/quantity), or CONDITION (constraint/criteria).
# BAD (title 반복 또는 너무 막연): "API를 구현한다", "보고서를 작성한다", "발표를 준비한다"
# GOOD (구체적 방법/범위/조건 포함):
#   "ERD 3개 테이블, Notion에 작성 후 팀 리뷰"
#   "A4 2장 분량, 서론·본론·결론 구조 준수"
#   "Canva 사용, 16:9 비율 슬라이드 10장"
#   "참고문헌 APA 7판 형식, 10건 이상"
#   "pytest 단위 테스트, 커버리지 70% 목표"
DESCRIPTION LENGTH: under 60 characters

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 반드시 아래 JSON 형식만 출력. 앞뒤 설명 텍스트 절대 금지.
# estimated_hours는 반드시 정수(int). null 출력 시 서버 오류 발생.

Respond with ONLY the following JSON and nothing else:
{{
  "tasks": [
    {{
      "title": "태스크 제목 (25자 이하)",
      "description": "구체적 방법/범위/조건 (60자 이하)",
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
                    "options": {"num_predict": 600, "temperature": 0.2},
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

    result = []
    for t in subtasks:
        if isinstance(t, dict):
            result.append(SubdivideTask(title=t.get("title", ""), description=t.get("description", "")))
        else:
            result.append(SubdivideTask(title=str(t), description=""))
    return SubdivideResponse(tasks=result)


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
