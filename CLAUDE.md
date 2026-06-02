# CampusFlow

캠퍼스 팀 프로젝트 관리 툴. AI 기반 태스크 분해 + 칸반 보드 + 대시보드.

**플로우 A (메인)**: AI 분해 → 즉시 DB 저장(assignee_id=NULL) → AiTaskPage Picking → 보드 관리
**플로우 B (보조)**: 팀원이 카드 직접 추가 → 본인 배정 → 보드 관리

## 서비스 구성

```
campusflow/
├── backend/    Spring Boot (포트 8080) — REST API, JWT 인증, JPA
├── frontend/   React + TypeScript + Vite (포트 3000)  — SPA
└── ai/         FastAPI + Ollama (포트 8000) — AI 태스크 분해
```

## 핵심 도메인 개념

- **Workspace**: 프로젝트 단위 공간. type = PERSONAL | TEAM
- **Task**: 칸반 카드. status = TODO | REVIEW | DOING | ISSUE | DONE. 소프트 삭제(deleted 플래그)
- **WorkspaceMember**: Workspace ↔ User 다대다 조인 엔티티. role = OWNER | MEMBER
- **Project**: Workspace 안의 세부 프로젝트 (현재 AI 태스크와 연결)
- **ContributionMetrics**: 팀원별 기여도 집계 (현재 업데이트 로직 미구현 — 주의)

## 작업 규칙

**기능 추가/수정 후 반드시 검증할 것:**

### 1단계 — 빌드 확인
| 변경 영역 | 실행 명령 | 통과 기준 |
|---|---|---|
| 백엔드 | `cd backend && ./gradlew build` | BUILD SUCCESSFUL |
| 프론트엔드 | `cd frontend && npm run build` | 에러 없이 완료 |
| 프론트엔드 타입 | `cd frontend && npx tsc --noEmit` | 타입 에러 0개 |

### 2단계 — 기능 오류 확인
- [ ] 추가/수정한 기능이 실제로 동작하는가
- [ ] 기존 핵심 플로우가 깨지지 않았는가
  - 로그인 → 워크스페이스 진입 → 태스크 생성 → 상태 변경
  - AI 태스크 분해 → AiTaskPage Picking → 보드 전송
- [ ] API 연동 시 콘솔 에러 없는가
- [ ] 새로 추가한 엔티티/필드가 DB에 정상 반영되는가 (nullable 주의)

### 3단계 — CLAUDE.md 업데이트
1. 완료된 기능 → "미완성 기능" 테이블 상태를 ✅ 완료로 변경
2. 새로 발견된 미완성/버그 → 테이블에 추가
3. 새 컴포넌트/페이지 → `frontend/CLAUDE.md` 구조 업데이트
4. 새 API 엔드포인트 → `backend/CLAUDE.md` 엔드포인트 목록 업데이트
5. AI 서비스 변경 → `ai/CLAUDE.md` 업데이트

**이 순서를 건너뛰면 다음 작업 시 빌드 실패 상태를 모르고 시작하게 됨.**

## 코딩 규칙

### 에러 처리 — 빈 catch 블록 금지
```typescript
// ❌ 금지 — 오류가 조용히 사라짐
try { await client.patch(...) } catch {}

// ✅ 최소한 콘솔 출력, 가능하면 사용자에게 피드백
try {
  await client.patch(...)
} catch (err) {
  console.error(err)
  alert("저장에 실패했습니다.")  // 또는 toast 등
}
```

### 새 필드/엔티티 추가 시 DB 규칙
- 새 컬럼은 반드시 `nullable = true` 또는 `@Builder.Default`로 기본값 지정 (기존 데이터 NULL 오류 방지)
- 백엔드 패턴: `@Builder.Default private boolean isXxx = false;`
- 새 엔티티 추가 시 기존 연관 엔티티에 영향 없는지 확인
- DB 스키마 변경 후 반드시 백엔드 재시작하여 Hibernate DDL 적용 확인

### 데이터 저장 — localStorage/state 단독 저장 금지
새 기능 구현 시 반드시 API → DB 저장 우선:
```typescript
// ❌ 금지 — 팀원에게 안 보이고 새로고침하면 사라짐
setMessages(prev => [...prev, newMsg])
localStorage.setItem("activity_log", ...)

// ✅ API 먼저 저장, 성공 후 화면 업데이트
await client.post("/api/messages", newMsg)
setMessages(prev => [...prev, newMsg])
```
localStorage는 캐시/폴백 용도로만 사용할 것. 유일한 저장소로 쓰지 말 것.

### Git 브랜치 규칙

**브랜치 네이밍: `feat/son-stage번호-기능명`**
```
feat/son-stage1-picking         ← 1단계 기능
feat/son-stage1-card-ui
feat/son-stage1-done-reaction
feat/son-stage2-comments        ← 2단계 기능
feat/son-stage2-activity-log
feat/son-stage3-websocket       ← 3단계 기능
```
- 이니셜 `son` 으로 팀원 브랜치와 즉시 구분

**머지 규칙 (반드시 준수):**
- `feat/son-*` → `develop` 에만 머지
- `dev` 에는 절대 직접 머지 금지
- 브랜치 생성 시 항상 `develop` 기준으로 생성

```bash
# 브랜치 생성 방법
git checkout develop
git checkout -b feat/son-stage1-picking

# 작업 완료 후 머지
git checkout develop
git merge feat/son-stage1-picking
git push origin develop
```

### Git 커밋 규칙
```
feat(범위): 새 기능 추가
fix(범위): 버그 수정
refactor(범위): 기능 변경 없는 코드 개선
style(범위): UI/CSS 변경
```
예시: `feat(picking): AiTaskPage 팀원 Picking 구조 전환`

### 발표 시연 데이터 보호
- 발표용 계정/워크스페이스는 개발 테스트와 분리하여 유지
- 발표 전날 체크리스트:
  - [ ] 시연용 워크스페이스에 깔끔한 테스트 데이터 준비
  - [ ] 백엔드/프론트/AI 서버 모두 정상 기동 확인
  - [ ] 핵심 플로우 (AI 분해 → AiTaskPage Picking → 보드 전송 → 내 태스크 필터 → 대시보드) 한 번 직접 실행
  - [ ] 오류 데이터 정리 (status NULL, 빈 제목 태스크 등)

## 알려진 미완성 기능 (작업 시 참고)

> **교수님 피드백 핵심**: "툴이 수동적(passive)이다 — 태스크를 만들고 드래그하면 끝, 그 이후 툴이 아무것도 안 한다"
> → 툴이 팀을 능동적으로 관찰하고 개입하는 구조가 필요함

### 카드 UI (협업이 눈에 보여야 함)
| 기능 | 상태 |
|---|---|
| 칸반 카드 담당자 표시 | ✅ 완료 — 카드에 담당자 아바타/이름 표시 |
| 칸반 카드 마감일 표시 | ✅ 완료 — 카드에 마감일 표시 |
| 칸반 카드 우선순위 배지 | 제거됨 (사용자 요청) |
| 마감 임박 카드 강조 | ✅ 완료 — D-3 이내 빨간 테두리 표시 |
| Task priority/estimated_hours | ✅ 완료 — Task 엔티티에 priority 필드 추가, AI 생성값 저장 |
| AiTaskPage 장바구니 ↔ 보드 실시간 동기화 | ✅ 완료 — 드래그 시 즉시 생성/삭제, backendId 추적 |
| AiTaskPage 섹션 헤더 표시 | ✅ 완료 — 흰 배경 가시성 수정, 세션별 분리 표시 |
| 장바구니 카드 세션 태그 | ✅ 완료 — 어떤 작업 분해인지 태그 표시 |

### 툴의 능동적 개입 (지속적 관리 느낌)
| 기능 | 상태 |
|---|---|
| DONE 처리 시 활동 피드 즉시 기록 | ✅ 완료 — task_status_history 기록, 대시보드 활동 피드 API 연결 완료 |
| ContributionMetrics 업데이트 | ✅ 완료 — DONE 시 task_completion_count 증가, ISSUE→DONE 시 issue_solving_count 증가 |
| 병목 태스크 감지 | ✅ 완료 — GET /api/workspaces/{id}/tasks/bottleneck, 대시보드 "⚠️ 주의 필요 태스크" 섹션 |
| 활동 피드 UI | ✅ 완료 — 대시보드 활동 피드 localStorage → task_status_history API 교체 |
| 알림 자동 생성 | ✅ 완료 — 상태 변경 시 본인 제외 워크스페이스 멤버 전체 알림 자동 저장 |
| 알림 UI | ✅ 완료 — 헤더 벨 아이콘 숫자 뱃지, STATUS_CHANGE/QUICK_SIGNAL 알림 드롭다운 표시 |
| 퀵 시그널 (핑) | ✅ 완료 — 카드 상세 모달에서 도움/피드백 요청 버튼, 카드 뱃지 표시, 팀원 알림 전송 |
| 마감 D-3 알림 | ✅ 완료 — @Scheduled 매일 오전 9시, dueDate D-3 담당자에게 DUE_DATE 알림 자동 생성 |

### 소통 (팀 간 실시간 공유)
| 기능 | 상태 |
|---|---|
| 댓글 | ✅ 완료 — team_communication 테이블 연결, 저장/조회 API 연동, 댓글 시 담당자 COMMENT 알림 |
| Community 채팅 | ✅ 완료 — 채널 생성/삭제(channels 테이블), 스레드(카카오톡 인용 버블), 멘션(@자동완성+알림), 우클릭 컨텍스트 메뉴(답글/수정/삭제), 채널 미읽 빨간 점 |
| 활동 로그 | ✅ 완료 — 대시보드 활동 피드로 대체(task_status_history API) |
| 실시간 동기화 | ✅ 완료 — 순수 WebSocket(TaskWebSocketHandler), 칸반 카드 드래그 시 팀원 화면 즉시 반영 |

> **댓글 vs 채팅 구분**: 둘 다 `team_communication` 테이블 사용. `task_id IS NOT NULL` = 태스크 댓글, `task_id IS NULL` = 워크스페이스 채팅(Community 패널)

### 기타
| 기능 | 상태 |
|---|---|
| ProjectAnalyticsService | 더미 데이터 반환 중 |
| 커스텀 컬럼 | 로컬 state만, 리로드 시 사라짐 |
| Planner 마감일 연결 | ✅ 완료 — tasks dueDate 기반 "다가오는 마감일" 목록 표시, D-3 이내 빨간 강조 |

## 환경 변수

- 백엔드: `src/main/resources/application.properties`
- AI: `.env` (OLLAMA_URL, OLLAMA_MODEL)

## 서비스별 상세

- 백엔드 상세 → `backend/CLAUDE.md`
- 프론트엔드 상세 → `frontend/CLAUDE.md`
- AI 서비스 상세 → `ai/CLAUDE.md`
- 기획 컨텍스트 → `PLANNING.md`
- 설계 산출물 → `docs/`
- 구현 로드맵 → `docs/구현로드맵.md`
