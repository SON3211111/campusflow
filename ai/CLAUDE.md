# AI 서비스 — FastAPI + Ollama

## 기술 스택

- Python, FastAPI, Ollama (qwen2.5:14b)
- 포트: 8000
- 실행: `uvicorn main:app --reload` 또는 Docker

## 환경 변수 (`.env`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OLLAMA_URL` | http://ollama:11434 | Ollama 서버 주소 |
| `OLLAMA_MODEL` | qwen2.5:14b | 사용할 모델 |
| `OLLAMA_MODELS` | (OLLAMA_MODEL과 동일) | 허용 모델 목록 (쉼표 구분) |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /health | 서버 상태 확인 |
| GET | /models | 사용 가능한 모델 목록 |
| POST | /generate-tasks | 프로젝트 설명 → 태스크 목록 생성 |
| POST | /subdivide-task | 단일 태스크 → 2개 서브태스크로 분해 |

## 요청/응답 구조

### POST /generate-tasks
```json
// 요청 (query param 또는 body)
{ "description": "프로젝트 설명", "model": null }

// 응답
{
  "tasks": [
    { "title": "태스크 제목", "description": "설명", "category": "카테고리명",
      "priority": "HIGH|MEDIUM|LOW", "estimated_hours": 4 }
  ]
}
```

### POST /subdivide-task
```json
// 요청
{ "task": "태스크 이름", "category": "카테고리명", "model": null }

// 응답
{ "tasks": ["서브태스크1", "서브태스크2"] }
```

## 프롬프트 규칙

- `_build_generate_prompt()`: 4~8개 태스크 생성, 카테고리 자동 추론, 한국어 출력
- `_build_subdivide_prompt()`: 반드시 2개로 분해 (준비 1개 + 실행 1개), 분해 불가 시 빈 배열
- AI 응답은 항상 `_extract_json()`으로 파싱 (```json 코드블록 처리 포함)

## 백엔드 연동

백엔드 `AiService`가 이 서비스로 프록시 요청:
- 백엔드 `/api/ai/generate-tasks` → AI `/generate-tasks`
- 백엔드 `/api/ai/subdivide-task` → AI `/subdivide-task`

## 주의 사항

- `priority`와 `estimated_hours`는 AI가 생성하지만 현재 백엔드 Task 엔티티에 해당 필드가 없어 저장되지 않음 — 1단계 DB 작업에서 `priority` varchar 필드 추가 예정
- `/generate-tasks` 타임아웃: 300초 (모델 응답이 느릴 수 있음)
- `/subdivide-task` 타임아웃: 120초
- 모델 변경 시 `.env`의 `OLLAMA_MODEL` 수정
