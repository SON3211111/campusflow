# CampusFlow AI 연동 통합 수정 내역

> 브랜치: `feature/integration-test`  
> 기준 브랜치: `dev`  
> 최종 업데이트: 2026-05-13

---

## 수정 배경

`feature/integration-test` 브랜치에서 전체 스택 통합 테스트를 진행하면서  
프론트엔드가 AI 기능을 백엔드를 거치지 않고 AI 서버에 직접 호출하는 문제를 발견했습니다.

- 기존: 프론트 → `/ai/generate` (AI 서버 직접 호출, 자유 텍스트)
- 변경: 프론트 → `/api/ai/generate-tasks` (백엔드 경유, 구조화된 응답)

---

## 수정 목록

### 🔵 수정 (Docker)

#### 1. 프론트 컨테이너 AI 서버 주소 미설정
- **파일**: `docker-compose.yml`
- **원인**: 프론트의 Vite 프록시(`/ai` 경로)가 `AI_TARGET` 환경변수를 참조하는데, frontend 서비스에 해당 값이 없어 Docker 환경에서 AI 서버를 못 찾음
- **수정**: frontend 서비스 environment에 `AI_TARGET=http://10.30.4.173:8000` 추가

```yaml
environment:
  - API_TARGET=http://backend:8080
  - AI_TARGET=http://10.30.4.173:8000  # 추가
```

---

### 🔵 수정 (프론트엔드)

#### 2. TaskBreakdownPage — AI 호출 경로 변경
- **파일**: `frontend/src/WorkspacePages/TaskBreakdownPage.tsx`
- **원인**: 기존에 `/ai/generate`에 한국어 시스템 프롬프트를 직접 붙여 보내는 방식 사용. 백엔드에 구현된 `/api/ai/generate-tasks` 엔드포인트를 활용하지 않음
- **수정**:
  - `callAI()` 함수를 `/api/ai/generate-tasks` 호출로 변경
  - 응답 형식 변환 함수 `convertToBreakdownResult()` 추가
    - 우리 응답: `{ tasks: [{ title, category, ... }] }`
    - 프론트 기대 형식: `{ title, categories: [{ name, tasks: string[] }] }`
    - category 기준으로 그룹핑해서 변환

```typescript
// 변경 전
const res = await axios.post(`${AI_SERVER_URL}/generate`, { prompt: systemPrompt }, { timeout: 60000 });

// 변경 후
const params = new URLSearchParams({ title: prompt, description: prompt });
const res = await axios.post(`/api/ai/generate-tasks?${params}`, {}, { timeout: 120000 });
setResult(convertToBreakdownResult(res.data, prompt));
```

#### 3. AiTaskPage — 다시 설정(handleReset) 호출 경로 변경
- **파일**: `frontend/src/WorkspacePages/AiTaskPage.tsx`
- **원인**: `handleReset`(🔄 다시 설정 버튼)도 기존에 `/ai/generate` 직접 호출
- **수정**: `/api/ai/generate-tasks` 호출로 변경, 응답을 동일하게 변환해서 화면 갱신
- **참고**: `handleSubDivide`(세부 분할)는 단일 업무를 2개로 쪼개는 기능으로 `/generate-tasks`와 용도가 다르므로 `/ai/generate` 그대로 유지

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `docker-compose.yml` | frontend 서비스에 `AI_TARGET` 환경변수 추가 |
| `frontend/src/WorkspacePages/TaskBreakdownPage.tsx` | `callAI()` 호출 경로 변경, `convertToBreakdownResult()` 추가 |
| `frontend/src/WorkspacePages/AiTaskPage.tsx` | `handleReset()` 호출 경로 변경 |

---

## 코드 리뷰 중 발견된 미수정 항목 (향후 작업)

| 파일 | 문제 | 심각도 |
|---|---|---|
| `config/SecurityConfig.java` | CORS 허용 출처 `localhost:3000` 하드코딩 — 배포 시 오류 | Important |
| `api/auth.ts` | `/users/me`, `/auth/logout` 백엔드 미구현 | Important |
| `api/project.ts` | `/projects` 관련 엔드포인트 백엔드 미구현 | Important |
| `TaskBreakdownPage.tsx` | AI 응답 null 체크 없음 | Minor |
