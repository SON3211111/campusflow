# CampusFlow AI 장바구니 업무 분배 — 추가·수정 내역

> 브랜치: `feature/ai-backend`  
> 기준 브랜치: `dev`  
> 최종 업데이트: 2026-05-12

---

## 작업 배경

팀장이 프로젝트 제목과 설명을 입력하면 AI가 4~8개의 업무 카드로 분해하고,  
팀원들이 장바구니처럼 드래그해서 가져가는 구조를 구현했습니다.

기존에는 백엔드가 AI 서버의 `/generate` (자유 텍스트) 엔드포인트만 사용하고 있었고,  
AI 서버에는 구조화된 업무 카드 생성 기능 자체가 없었습니다.

이 브랜치에서 추가·수정한 내용:
- AI 서버(`ai/main.py`)에 `/generate-tasks` 엔드포인트 신규 구현
- 백엔드에 AI 서버 연동 DTO 및 서비스·컨트롤러 추가
- Docker에 NVIDIA GPU 설정 추가 (AI 서버 전용 컴퓨터 RTX 5070 Ti 활용)

---

## 추가·수정 목록

### 🟢 신규 구현 (AI 서버)

#### 1. `/generate-tasks` 엔드포인트 — AI 업무 카드 생성
- **파일**: `ai/main.py`
- **내용**: `POST /generate-tasks` 엔드포인트 추가
- **입력**: `{ "title": "프로젝트 제목", "description": "프로젝트 설명" }`
- **출력**: `{ "tasks": [ { title, description, category, priority, estimated_hours } ] }`
- **규칙**:
  - 4~8개 업무로 분해
  - 담당자 미지정 (팀원이 직접 가져가는 장바구니 방식)
  - `category`: 기획 / 디자인 / 프론트 / 백엔드 / 테스트 중 하나
  - `priority`: HIGH / MEDIUM / LOW
  - `estimated_hours`: 예상 소요 시간 (정수)

#### 2. JSON 파싱 로직 개선 — `_extract_json()`
- **파일**: `ai/main.py`
- **원인**: AI가 마크다운 코드블록(` ```json ... ``` `)으로 응답하거나, 중첩 JSON에서 정규식이 첫 번째 `}`에서 멈추는 문제 발생
- **수정**:
  1. 먼저 마크다운 코드블록이 있으면 내용만 추출
  2. `{` / `}` 깊이(depth)를 직접 추적해서 가장 바깥 JSON 객체를 정확히 추출

#### 3. 토큰 수·온도 조정
- **파일**: `ai/main.py` — `generate_tasks()` 함수 내 Ollama 호출 옵션
- **원인**: `num_predict: 1200`이면 업무 카드 7개 이상 생성 시 JSON이 중간에 잘림
- **수정**: `num_predict: 2500`, `temperature: 0.3`
  - `num_predict`: 충분한 출력 길이 확보
  - `temperature 0.3`: 낮을수록 일관된 JSON 형식 출력

#### 4. 프롬프트 영어 작성
- **파일**: `ai/main.py` — `_build_generate_prompt()`
- **이유**: 오픈소스 LLM(gemma, llama 등)은 영어 지시문에서 더 정확하게 동작함. 출력 카테고리명은 한국어(`기획`, `백엔드` 등)로 명시해 프론트와 일치시킴

---

### 🟢 신규 파일 (백엔드)

#### 5. `TaskDto` — 업무 카드 단일 항목 DTO
- **파일**: `backend/src/main/java/com/campusflow/dto/TaskDto.java` (신규)
- **내용**: AI 서버 `/generate-tasks` 응답의 업무 카드 한 개
- **필드**: `title`, `description`, `category`, `priority`, `estimatedHours`
- **주의**: `ai/main.py`의 `Task` 클래스와 필드가 일치해야 JSON 역직렬화가 정상 동작함

```java
public record TaskDto(
    String title,
    String description,
    String category,        // 기획 / 디자인 / 프론트 / 백엔드 / 테스트
    String priority,        // HIGH / MEDIUM / LOW
    Integer estimatedHours  // 예상 소요 시간 (null 가능)
) {}
```

#### 6. `TaskListDto` — 업무 카드 목록 DTO
- **파일**: `backend/src/main/java/com/campusflow/dto/TaskListDto.java` (신규)
- **내용**: AI 서버 `/generate-tasks` 응답 전체 구조 (`{ "tasks": [...] }`)

```java
public record TaskListDto(List<TaskDto> tasks) {}
```

---

### 🔵 수정 (백엔드)

#### 7. `AiService` — `generateTasks()` 메서드 추가
- **파일**: `backend/src/main/java/com/campusflow/service/AiService.java`
- **원인**: 기존 `getAiRecommendation()`은 AI 서버의 `/generate` (자유 텍스트)만 호출. 구조화된 업무 카드 생성 기능 없음
- **수정**: `generateTasks(String title, String description)` 추가
  - AI 서버 `POST /generate-tasks` 호출
  - 응답을 `TaskListDto`로 역직렬화해서 반환
  - 기존 `getAiRecommendation()`은 그대로 유지 (하위 호환)

#### 8. `AiController` — `POST /api/ai/generate-tasks` 엔드포인트 추가
- **파일**: `backend/src/main/java/com/campusflow/controller/AiController.java`
- **원인**: 프론트엔드에서 AI 업무 카드를 받을 API 엔드포인트 없음
- **수정**: `@PostMapping("/generate-tasks")` 추가
  - 파라미터: `title`, `description` (RequestParam)
  - 응답: `ResponseEntity<TaskListDto>` (200 OK 또는 500)
  - 기존 `POST /api/ai/recommend` 엔드포인트는 그대로 유지

---

### 🔵 수정 (Docker)

#### 9. Ollama 컨테이너 — NVIDIA GPU 설정 추가
- **파일**: `docker-compose.yml`
- **원인**: AI 서버 전용 컴퓨터에 RTX 5070 Ti가 있으나 Docker Compose에 GPU 설정이 없어 CPU로만 동작
- **수정**: `ollama` 서비스에 `deploy.resources.reservations.devices` 추가

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

- **적용 조건**: 서버에 `nvidia-container-toolkit`이 설치되어 있어야 함

---

## 변경 파일 목록

### AI 서버
| 파일 | 변경 내용 |
|---|---|
| `ai/main.py` | `/generate-tasks` 엔드포인트 추가, `_extract_json()` depth 추적 방식으로 개선, `num_predict` 2500·`temperature` 0.3 설정 |

### 백엔드
| 파일 | 변경 내용 |
|---|---|
| `dto/TaskDto.java` | **신규** — 업무 카드 단일 항목 DTO |
| `dto/TaskListDto.java` | **신규** — 업무 카드 목록 DTO |
| `service/AiService.java` | `generateTasks()` 메서드 추가 |
| `controller/AiController.java` | `POST /api/ai/generate-tasks` 엔드포인트 추가 |

### Docker
| 파일 | 변경 내용 |
|---|---|
| `docker-compose.yml` | `ollama` 서비스에 NVIDIA GPU 디바이스 예약 설정 추가 |

---

## 프론트엔드 연동 방법 (향후 작업)

프론트엔드에서 이 기능을 사용하려면 아래 API를 호출하면 됩니다:

```
POST /api/ai/generate-tasks?title=프로젝트%20제목&description=프로젝트%20설명
```

응답 예시:
```json
{
  "tasks": [
    {
      "title": "요구사항 정의서 작성",
      "description": "프로젝트 목표와 기능 요구사항을 문서화한다",
      "category": "기획",
      "priority": "HIGH",
      "estimatedHours": 4
    }
  ]
}
```

- AI 응답 시간: 모델 크기에 따라 10~60초 소요 (타임아웃 350초 설정됨)
- 담당자는 응답에 포함되지 않음 — 팀원이 장바구니에서 직접 선택
