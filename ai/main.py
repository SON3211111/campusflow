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
    # 프론트에서 선택한 도메인 (없으면 AI가 자동 판단)
    domain: str | None = None
    # 팀 인원·마감은 프롬프트에 컨텍스트로 주입
    team_size: int | None = None
    deadline: str | None = None


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


def _get_domain_fewshot(domain: str | None) -> str:
    """
    도메인별 완성된 JSON 출력 예시를 반환한다.
    규칙만 읽는 것보다 예시를 보는 게 모델이 훨씬 더 잘 따라온다(few-shot).
    도메인이 None이거나 매핑이 없으면 소프트웨어 예시를 기본으로 사용.
    """
    examples = {
        "software_dev": """\
EXAMPLE OUTPUT for software development project:
{"tasks":[
  {"title":"요구사항 명세서 작성","description":"기능 목록·비기능 요구사항 Notion 정리, 팀 리뷰 포함","category":"기획","priority":"HIGH","estimated_hours":3},
  {"title":"ERD 및 테이블 설계","description":"사용자·게시글·댓글 3개 테이블, draw.io ERD 작성","category":"설계","priority":"HIGH","estimated_hours":4},
  {"title":"로그인·회원가입 API","description":"JWT 발급, /auth/login·/auth/signup 2개 엔드포인트","category":"백엔드","priority":"HIGH","estimated_hours":6},
  {"title":"게시글 CRUD API","description":"목록·상세·작성·수정·삭제 5개 REST 엔드포인트","category":"백엔드","priority":"MEDIUM","estimated_hours":8},
  {"title":"메인 화면 UI 구현","description":"React 컴포넌트, 게시글 목록 카드 레이아웃","category":"프론트엔드","priority":"MEDIUM","estimated_hours":6},
  {"title":"로그인 화면 UI 구현","description":"폼 유효성 검사 포함, JWT 로컬스토리지 저장","category":"프론트엔드","priority":"MEDIUM","estimated_hours":4},
  {"title":"API 연동 및 통합 테스트","description":"프론트-백엔드 연동, 주요 시나리오 5개 수동 테스트","category":"테스트","priority":"MEDIUM","estimated_hours":5},
  {"title":"배포 환경 설정","description":"Docker Compose 작성, 클라우드 서버 배포","category":"배포","priority":"LOW","estimated_hours":4}
]}""",

        "academic_report": """\
EXAMPLE OUTPUT for academic report assignment:
{"tasks":[
  {"title":"주제 선정 및 역할 분담","description":"토론으로 세부 주제 확정, 파트별 담당자 배정표 작성","category":"기획","priority":"HIGH","estimated_hours":2},
  {"title":"선행 연구 문헌 수집","description":"RISS·Google Scholar 논문 10편 이상 수집 및 목록화","category":"자료조사","priority":"HIGH","estimated_hours":4},
  {"title":"통계·사례 데이터 수집","description":"공신력 있는 기관 통계 5건 이상, 출처 URL 기록","category":"자료조사","priority":"MEDIUM","estimated_hours":3},
  {"title":"보고서 아웃라인 작성","description":"서론·본론(3파트)·결론 구조, 각 파트 분량 합의","category":"집필","priority":"HIGH","estimated_hours":2},
  {"title":"본론 초안 작성","description":"각자 담당 파트 A4 2장 분량 초안, Google Docs 공유","category":"집필","priority":"MEDIUM","estimated_hours":8},
  {"title":"서론·결론 작성","description":"연구 배경·목적·한계 포함, A4 1.5장","category":"집필","priority":"MEDIUM","estimated_hours":3},
  {"title":"전체 초안 교차 검토","description":"맞춤법·논리 흐름·인용 오류 체크, 댓글로 피드백","category":"편집","priority":"MEDIUM","estimated_hours":3},
  {"title":"참고문헌 및 양식 정리","description":"APA 7판 형식 통일, 표지·목차·페이지 번호 적용","category":"편집","priority":"LOW","estimated_hours":2},
  {"title":"발표 슬라이드 제작","description":"핵심 내용 요약 15장, Canva 팀 템플릿 사용","category":"발표준비","priority":"MEDIUM","estimated_hours":4}
]}""",

        "presentation": """\
EXAMPLE OUTPUT for presentation assignment:
{"tasks":[
  {"title":"발표 주제·범위 확정","description":"10분 발표 기준 커버할 내용 범위 팀 합의","category":"기획","priority":"HIGH","estimated_hours":1},
  {"title":"핵심 내용 자료 조사","description":"신뢰도 높은 출처 5개 이상, 통계·사례 중심 수집","category":"자료조사","priority":"HIGH","estimated_hours":4},
  {"title":"스토리라인 구성","description":"오프닝·본론 3파트·클로징 흐름, 1장짜리 개요 작성","category":"기획","priority":"HIGH","estimated_hours":2},
  {"title":"슬라이드 초안 제작","description":"Canva 사용, 16:9 슬라이드 20장, 비주얼 강조","category":"제작","priority":"MEDIUM","estimated_hours":6},
  {"title":"발표 스크립트 작성","description":"파트별 2분 분량, 자연스러운 구어체로 작성","category":"제작","priority":"MEDIUM","estimated_hours":4},
  {"title":"슬라이드 피드백·수정","description":"팀원 상호 검토 후 디자인·내용 2차 수정","category":"제작","priority":"MEDIUM","estimated_hours":3},
  {"title":"예상 질문 목록 작성","description":"Q&A 대비 예상 질문 10개 + 답변 초안 작성","category":"발표준비","priority":"MEDIUM","estimated_hours":2},
  {"title":"리허설 및 최종 점검","description":"전체 흐름 1회 리허설, 시간 측정 및 피드백 반영","category":"발표준비","priority":"HIGH","estimated_hours":2}
]}""",

        "design_ux": """\
EXAMPLE OUTPUT for UI/UX design assignment:
{"tasks":[
  {"title":"사용자 리서치 계획","description":"인터뷰 대상 5명 선정, 반구조화 질문지 10문항 작성","category":"리서치","priority":"HIGH","estimated_hours":3},
  {"title":"사용자 인터뷰 진행","description":"대상자 5명 인터뷰, 녹취 후 Pain Point 3개 도출","category":"리서치","priority":"HIGH","estimated_hours":5},
  {"title":"경쟁 서비스 분석","description":"유사 앱 3개 UI/UX 비교, 강·약점 분석표 작성","category":"리서치","priority":"MEDIUM","estimated_hours":3},
  {"title":"사용자 페르소나 작성","description":"인터뷰 기반 퍼소나 2개, 목표·불만·사용 맥락 포함","category":"기획","priority":"MEDIUM","estimated_hours":2},
  {"title":"로우파이 와이어프레임","description":"Figma로 주요 화면 6개 스케치 수준 와이어프레임","category":"디자인","priority":"HIGH","estimated_hours":5},
  {"title":"하이파이 프로토타입","description":"컬러·타이포 적용, Figma 인터랙티브 프로토타입 제작","category":"디자인","priority":"MEDIUM","estimated_hours":8},
  {"title":"사용성 테스트","description":"프로토타입으로 3명 테스트, 태스크 완료율 측정","category":"테스트","priority":"MEDIUM","estimated_hours":4},
  {"title":"디자인 시스템 문서화","description":"컬러·타이포·컴포넌트 가이드라인 Figma 페이지 정리","category":"문서","priority":"LOW","estimated_hours":3}
]}""",

        "marketing_biz": """\
EXAMPLE OUTPUT for marketing/business assignment:
{"tasks":[
  {"title":"시장 및 타겟 분석","description":"목표 고객 세그먼트 정의, 시장 규모 통계 3건 수집","category":"분석","priority":"HIGH","estimated_hours":4},
  {"title":"경쟁사 벤치마킹","description":"경쟁사 3곳 서비스·가격·마케팅 전략 비교표 작성","category":"분석","priority":"HIGH","estimated_hours":4},
  {"title":"마케팅 전략 기획","description":"4P 분석 기반 핵심 전략 3가지 도출, 팀 합의","category":"기획","priority":"HIGH","estimated_hours":3},
  {"title":"SNS 콘텐츠 캘린더","description":"인스타·유튜브 채널별 4주치 게시 계획표 작성","category":"콘텐츠","priority":"MEDIUM","estimated_hours":3},
  {"title":"홍보 콘텐츠 제작","description":"카드뉴스 3종 + 숏폼 영상 스크립트 1개 제작","category":"콘텐츠","priority":"MEDIUM","estimated_hours":6},
  {"title":"재무 추정표 작성","description":"3년치 손익계산서 엑셀 작성, 손익분기점 계산 포함","category":"재무","priority":"MEDIUM","estimated_hours":5},
  {"title":"최종 발표 자료 제작","description":"PPT 20장, 핵심 지표·전략·실행계획 시각화","category":"발표","priority":"MEDIUM","estimated_hours":5},
  {"title":"사업계획서 최종 편집","description":"목차·양식 통일, 팀원 검토 후 최종본 PDF 변환","category":"문서","priority":"LOW","estimated_hours":2}
]}""",

        "event_planning": """\
EXAMPLE OUTPUT for event planning assignment:
{"tasks":[
  {"title":"행사 기획안 작성","description":"목적·대상·일정·예산 포함한 기획서 1차 초안","category":"기획","priority":"HIGH","estimated_hours":3},
  {"title":"장소 섭외 및 대관","description":"후보 3곳 견적 비교 후 계약, 수용 인원 200명 기준","category":"준비","priority":"HIGH","estimated_hours":4},
  {"title":"예산안 작성","description":"항목별 견적 수집, 총예산 내 배분표 엑셀 작성","category":"기획","priority":"HIGH","estimated_hours":2},
  {"title":"홍보물 제작","description":"포스터 1종·SNS 카드뉴스 3종, Canva 제작","category":"홍보","priority":"MEDIUM","estimated_hours":4},
  {"title":"SNS 및 커뮤니티 홍보","description":"인스타·에브리타임 게시 3회, 참가 신청 링크 포함","category":"홍보","priority":"MEDIUM","estimated_hours":2},
  {"title":"당일 타임테이블 작성","description":"분 단위 진행표, 역할 분담(사회·스태프·촬영) 확정","category":"운영","priority":"MEDIUM","estimated_hours":2},
  {"title":"참가자 신청·관리","description":"구글폼 제작, 접수 현황 스프레드시트 실시간 관리","category":"운영","priority":"MEDIUM","estimated_hours":3},
  {"title":"결과 보고서 작성","description":"참가 인원·만족도 설문 결과 정리, A4 3장 보고서","category":"마무리","priority":"LOW","estimated_hours":3}
]}""",

        "engineering": """\
EXAMPLE OUTPUT for engineering design assignment:
{"tasks":[
  {"title":"요구사항 및 제약 분석","description":"설계 스펙·재료 제약·안전 기준 문서 정리","category":"기획","priority":"HIGH","estimated_hours":3},
  {"title":"개념 설계 3가지 도출","description":"브레인스토밍으로 설계안 3개 스케치, 장단점 비교","category":"설계","priority":"HIGH","estimated_hours":4},
  {"title":"상세 설계 및 도면 작성","description":"최종 채택 안 CAD 도면 작성, 치수·재료 명기","category":"설계","priority":"HIGH","estimated_hours":8},
  {"title":"부품 목록 및 발주","description":"BOM 작성, 예산 내 부품 구매처 확정 및 주문","category":"제작","priority":"MEDIUM","estimated_hours":2},
  {"title":"시제품 제작","description":"도면 기준 조립, 납땜·가공 작업 팀 분업 진행","category":"제작","priority":"HIGH","estimated_hours":10},
  {"title":"성능 실험 및 측정","description":"조건 3가지 변경하며 측정, 결과 데이터 기록","category":"실험","priority":"MEDIUM","estimated_hours":5},
  {"title":"실험 결과 분석","description":"이론값 vs 측정값 비교, 오차 원인 분석 보고서","category":"분석","priority":"MEDIUM","estimated_hours":4},
  {"title":"최종 보고서 작성","description":"설계 과정·결과·개선점 포함, 양식 준수 A4 10장","category":"문서","priority":"LOW","estimated_hours":5}
]}""",

        "research_science": """\
EXAMPLE OUTPUT for research/science assignment:
{"tasks":[
  {"title":"연구 주제 및 가설 설정","description":"독립·종속변수 정의, 검증 가능한 가설 2개 수립","category":"기획","priority":"HIGH","estimated_hours":2},
  {"title":"선행 연구 리뷰","description":"관련 논문 15편 수집, 연구 방법·결과 요약 정리","category":"문헌조사","priority":"HIGH","estimated_hours":6},
  {"title":"실험 설계 및 프로토콜","description":"대조군·실험군 설정, 변수 통제 방법 문서화","category":"설계","priority":"HIGH","estimated_hours":3},
  {"title":"실험 재료·장비 준비","description":"필요 시약·장비 목록 작성, 실험실 예약 및 수령","category":"준비","priority":"MEDIUM","estimated_hours":2},
  {"title":"본 실험 수행","description":"프로토콜대로 3회 반복 측정, 원자료 기록지 작성","category":"실험","priority":"HIGH","estimated_hours":8},
  {"title":"데이터 분석","description":"Python pandas 기술통계, t-test 유의성 검증","category":"분석","priority":"HIGH","estimated_hours":6},
  {"title":"결과 시각화","description":"matplotlib 그래프 5개, 오차 막대 포함","category":"분석","priority":"MEDIUM","estimated_hours":3},
  {"title":"논문 형식 보고서 작성","description":"서론·방법·결과·고찰·결론 구조, APA 인용 형식","category":"문서","priority":"MEDIUM","estimated_hours":6}
]}""",
    }
    # 매핑 없는 도메인은 소프트웨어 예시를 기본으로 사용
    return examples.get(domain or "", examples["software_dev"])


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


def _build_generate_prompt(description: str, domain: str | None = None,
                           team_size: int | None = None, deadline: str | None = None) -> str:
    # ── 왜 영어로 작성하는가 ──────────────────────────────────────────────────
    # qwen2.5 같은 오픈소스 모델은 영어 지시문을 훨씬 더 정확히 따른다.
    # 한국어 지시문으로 바꾸면 JSON 포맷을 어기거나 규칙을 무시하는 경우가 많았음.
    # 출력(태스크 제목/설명)은 한국어로 강제하되, 지시문 자체는 영어 유지.
    # ─────────────────────────────────────────────────────────────────────────
    # 팀 컨텍스트 문자열 조립 (입력된 것만 포함)
    context_lines = []
    if domain:
        context_lines.append(f"Domain: {domain}")
    if team_size:
        context_lines.append(f"Team size: {team_size} people")
    if deadline:
        context_lines.append(f"Deadline: {deadline}")
    context_block = ("\n" + "\n".join(context_lines)) if context_lines else ""

    # 도메인별 few-shot 예시 (규칙만 읽는 것보다 예시가 훨씬 효과적)
    fewshot = _get_domain_fewshot(domain)

    return f"""You are a university team project task breakdown AI.
Your job is to help college students split their team assignment into clear, assignable tasks.

[Project / Assignment]
Description: {description}{context_block}

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
EXAMPLE — study this carefully and follow the same style
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 아래는 실제 좋은 출력 예시다. 이 스타일을 반드시 따를 것.
# 특히 description의 구체성, estimated_hours의 정수 출력,
# 카테고리명의 도메인 적합성을 주의 깊게 참고할 것.

{fewshot}

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

    prompt = _build_generate_prompt(
        req.description,
        domain=req.domain,
        team_size=req.team_size,
        deadline=req.deadline,
    )

    # ── 자동 재시도 로직 ──────────────────────────────────────────────────────
    # 태스크가 8개 미만이거나 JSON 파싱 실패 시 최대 3회 재시도.
    # 재시도 시 temperature를 약간 높여 다른 출력을 유도한다.
    # 3회 모두 실패하면 마지막 에러를 그대로 반환.
    # ─────────────────────────────────────────────────────────────────────────
    MAX_ATTEMPTS = 3
    last_error: Exception | None = None
    tasks_data: list = []

    async with httpx.AsyncClient(timeout=300.0) as http:
        for attempt in range(MAX_ATTEMPTS):
            # 재시도할수록 temperature를 조금씩 높여 다른 결과 유도
            temperature = 0.3 + attempt * 0.15

            try:
                response = await http.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "num_predict": 4000,
                            "temperature": temperature,
                        },
                    },
                )
                response.raise_for_status()
                raw_text = response.json().get("response", "")

            except httpx.HTTPError as e:
                import traceback; traceback.print_exc()
                last_error = HTTPException(status_code=502, detail=repr(e))
                continue
            except Exception as e:
                import traceback; traceback.print_exc()
                last_error = HTTPException(status_code=500, detail=repr(e))
                continue

            # JSON 파싱 시도
            try:
                parsed = _extract_json(raw_text)
                tasks_data = parsed.get("tasks", [])
                if not isinstance(tasks_data, list):
                    raise ValueError("tasks가 배열이 아닙니다.")
            except (ValueError, json.JSONDecodeError) as e:
                last_error = HTTPException(
                    status_code=422,
                    detail=f"AI 응답 파싱 실패 (시도 {attempt+1}): {e}\n원문: {raw_text[:300]}",
                )
                continue

            # 태스크 수 검증: 8개 미만이면 재시도
            if len(tasks_data) < 8:
                last_error = HTTPException(
                    status_code=422,
                    detail=f"태스크 수 부족 (시도 {attempt+1}): {len(tasks_data)}개 생성됨, 최소 8개 필요",
                )
                continue

            # 성공 — 루프 탈출
            last_error = None
            break

    if last_error:
        raise last_error

    # dict 목록 → Task 객체 목록 변환
    tasks = [
        Task(
            title=t.get("title", ""),
            description=t.get("description", ""),
            category=t.get("category", "기타"),
            priority=t.get("priority", "MEDIUM").upper(),
            estimated_hours=t.get("estimated_hours") or 2,  # null 방어: 기본값 2시간
        )
        for t in tasks_data
    ]

    return TaskGenerateResponse(tasks=tasks)
