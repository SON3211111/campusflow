# CampusFlow

캠퍼스 팀 프로젝트 관리 툴. AI 기반 태스크 분해 + 칸반 보드 + 대시보드.

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
  - AI 태스크 분해 → 보드 전송
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
feat/son-stage1-task-pool       ← 1단계 기능
feat/son-stage1-my-task
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
git checkout -b feat/son-stage1-task-pool

# 작업 완료 후 머지
git checkout develop
git merge feat/son-stage1-task-pool
git push origin develop
```

### Git 커밋 규칙
```
feat(범위): 새 기능 추가
fix(범위): 버그 수정
refactor(범위): 기능 변경 없는 코드 개선
style(범위): UI/CSS 변경
```
예시: `feat(task-pool): Task Pool 화면 + Picking UI 구현`

### 발표 시연 데이터 보호
- 발표용 계정/워크스페이스는 개발 테스트와 분리하여 유지
- 발표 전날 체크리스트:
  - [ ] 시연용 워크스페이스에 깔끔한 테스트 데이터 준비
  - [ ] 백엔드/프론트/AI 서버 모두 정상 기동 확인
  - [ ] 핵심 플로우 (AI 분해 → 배정 → 보드 → 대시보드) 한 번 직접 실행
  - [ ] 오류 데이터 정리 (status NULL, 빈 제목 태스크 등)

## 알려진 미완성 기능 (작업 시 참고)

| 기능 | 상태 |
|---|---|
| 댓글 | UI만 있음, Comment 엔티티/API 없음 |
| ContributionMetrics | 업데이트 로직 없어 항상 0 |
| ProjectAnalyticsService | 더미 데이터 반환 중 |
| 활동 로그 | localStorage 기반, 팀원 간 미공유 |
| Task priority/estimated_hours | AI가 생성하지만 Task 엔티티에 필드 없음 |
| 커스텀 컬럼 | 로컬 state만, 리로드 시 사라짐 |
| 알림 UI | 백엔드 API 완성, 프론트엔드 없음 |
| 실시간 동기화 | WebSocket/폴링 없음 |

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
