# Frontend — React + TypeScript

## 기술 스택

- React 18, TypeScript, Vite
- React Router v6 (SPA 라우팅)
- axios (`src/api/client.ts` — baseURL: 백엔드 포트 8080)
- 포트: 3000 (팀 공통), 5173 (일부 로컬 환경)
- 실행: `npm run dev`

## 디렉토리 구조

새 컴포넌트/페이지 추가 시 아래 구조에 반영할 것.

```
src/
├── api/            client.ts (axios 인스턴스), auth.ts, project.ts
├── pages/          인증 관련 페이지 (Login, Signup, MainPage, UserSetup, Mailcode)
├── ListPages/      워크스페이스 목록 화면 (WorkspaceList, MemberPage, SettingPage 등)
├── WorkspacePages/ 워크스페이스 내부 화면 (WorkSpacePage, DashboardPage, AiTaskPage, TaskBreakdownPage)
└── components/     재사용 컴포넌트
                    Header, BoardSubHeader, WorkspaceTabBar, CardDetailModal,
                    AITaskModal, BoardSlideView, BoardCreator, BoardSubHeader,
                    JoinModal, WorkspaceCard
```

## 라우팅 구조 (`App.tsx`)

| 경로 | 컴포넌트 | 설명 |
|---|---|---|
| / | MainPage | 랜딩 |
| /login | Login | 로그인 |
| /signup | Signup | 회원가입 |
| /workspace | WorkspaceList | 워크스페이스 목록 (홈) |
| /workspace-board | WorkSpacePage | 칸반 보드 |
| /dashboard | DashboardPage | 대시보드 |
| /ai-tasks | AiTaskPage | AI 태스크 배정 |
| /task-breakdown | TaskBreakdownPage | AI 태스크 분해 입력 |
| /members | MemberPage | 멤버 관리 |
| /settings | SettingPage | 워크스페이스 설정 |

## 페이지 간 상태 전달

React Router `state`로 workspace 정보를 전달:
```typescript
navigate('/workspace-board', { state: { workspace, workspaces } })
```

페이지 내에서는 항상 localStorage 폴백 처리:
```typescript
const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
const workspace = state?.workspace ?? savedWs;
```

## localStorage 키 목록

| 키 | 값 | 용도 |
|---|---|---|
| `userId` | string | 로그인한 유저 ID |
| `userName` | string | 로그인한 유저 이름 |
| `token` | string | JWT 토큰 |
| `clickedWorkspace` | JSON | 마지막으로 클릭한 워크스페이스 |
| `board_stats` | JSON | 대시보드 통계 캐시 |
| `ai_task_session_{wsId}` | JSON | AI 태스크 세션 저장 (Picking 구현 후 DB로 대체 예정 — deprecated) |
| `ws_gradient_{wsId}` | string | 워크스페이스 그라데이션 색상 |
| `workspace_activity_{wsId}` | JSON | 활동 로그 (로컬 전용) |
| `saved_ai_tasks` | JSON | 저장된 AI 태스크 목록 |

## API 호출 패턴

```typescript
import client from "../api/client";

// GET
const res = await client.get(`/workspaces/${workspaceId}/tasks`);
const data = res.data.data ?? [];  // ApiResponse<T> 래퍼에서 .data.data로 접근

// POST
const res = await client.post(`/workspaces/${workspaceId}/tasks`, { title, status, assigneeId });

// PATCH
await client.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status?status=${newStatus}`);
```

## Task 상태 ↔ 컬럼명 매핑

```typescript
const COL_TO_STATUS = {
  "상태 없음": "TODO",
  "시작하지 않음": "REVIEW",
  "진행 중": "DOING",
  "보류 중": "ISSUE",
  "완료": "DONE",
};
```

## 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `Header` | 상단 네비게이션, 워크스페이스 드롭다운 |
| `BoardSubHeader` | 보드 내 서브헤더 (멤버 아바타, AI 버튼) |
| `WorkspaceTabBar` | 하단 탭 (Board/Planner/Community/휴지통) |
| `CardDetailModal` | 태스크 상세 편집 (설명, 마감일, 댓글 UI) |
| `AITaskModal` | AI 업무 분해 시작 모달 |
| `BoardSlideView` | 슬라이드 보드 뷰 |

## CSS 규칙

- 각 페이지/컴포넌트마다 동일 이름의 `.css` 파일 사용 (예: `DashboardPage.css`)
- BEM 유사 클래스명: `dbp-` (Dashboard), `wsp-` (WorkSpace), `atp-` (AiTask), `cdm-` (CardDetailModal)

## 주의 사항

- 댓글(`CardDetailModal`)은 UI만 있고 API 연결 없음 — 저장 안 됨 (2단계 구현 예정)
- Community 채팅은 보드 왼쪽 사이드패널 구조 → **탭 전환 방식으로 변경 예정** (WorkspaceTabBar Community 탭 클릭 시 화면 전환), team_communication 연결 필요
- AiTaskPage는 현재 localStorage(`ai_task_session_{wsId}`) 기반 → **DB에서 `assignee_id IS NULL` 태스크 로드 방식으로 전환 예정** (Picking 구현 시)
- Planner 캘린더의 "다가오는 마감일" 섹션은 하드코딩된 빈 상태 — tasks dueDate 연결 필요
- 활동 로그는 localStorage 기반으로 팀원 간 공유 안 됨 (2단계 구현 예정)
