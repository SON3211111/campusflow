# Frontend — React + TypeScript

## 기술 스택

- React 19, TypeScript, Vite
- React Router v7 (SPA 라우팅)
- axios (`src/api/client.ts` — baseURL: 백엔드 포트 8080)
- 포트: 3000 (팀 공통), 5173 (일부 로컬 환경)
- 실행: `npm run dev`

## 디렉토리 구조

새 컴포넌트/페이지 추가 시 아래 구조에 반영할 것.

```
src/
├── api/            client.ts (axios 인스턴스), auth.ts, project.ts
├── pages/          인증/랜딩/개인 설정 페이지 (Login, Signup, MainPage, UserSetup, Mailcode, ProfileSettings)
├── ListPages/      워크스페이스 목록 화면 (WorkspaceList, MemberPage, SettingPage 등)
├── WorkspacePages/ 워크스페이스 내부 화면 (WorkSpacePage, DashboardPage, AiTaskPage, TaskBreakdownPage)
├── components/     재사용 컴포넌트
                    Header, BoardSubHeader, WorkspaceTabBar, CardDetailModal,
                    AITaskModal, BoardSlideView, BoardCreator, BoardSubHeader,
                    JoinModal, WorkspaceCard, PixelAvatar
└── utils/          workspaceTheme, appTheme, appLanguage
```

## 라우팅 구조 (`App.tsx`)

| 경로 | 컴포넌트 | 설명 |
|---|---|---|
| / | MainPage | 랜딩 |
| /login | Login | 로그인 |
| /signup | Signup | 회원가입 |
| /mailcode | MailCode | 이메일 인증 |
| /usersetup | UserSetup | 회원가입 추가 정보 입력 |
| /profile-settings | ProfileSettings | 개인정보/아바타/테마/언어 설정 |
| /workspace | WorkspaceList | 워크스페이스 목록 (홈) |
| /workspace-board | WorkSpacePage | 칸반 보드 |
| /dashboard | DashboardPage | 대시보드 |
| /ai-task | AiTaskPage | AI 태스크 배정 |
| /task-breakdown | TaskBreakdownPage | AI 태스크 분해 입력 |
| /members | MemberPage | 멤버 관리 |
| /settings | SettingPage | 워크스페이스 설정 |
| /templates | TemplatePage | 워크스페이스 템플릿/색상 |
| /notifications | NotificationPage | 알림 센터 + 병목 리포트 |
| /join | JoinPage | 초대 참여 |

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
| `accessToken` | string | 현재 사용 중인 JWT 토큰 키 |
| `clickedWorkspace` | JSON | 마지막으로 클릭한 워크스페이스 |
| `board_stats` | JSON | 대시보드 통계 캐시 |
| `ai_task_session_{wsId}` | JSON | AI 태스크 세션/화면 상태 캐시 |
| `ws_gradient_{wsId}` | string | 워크스페이스 그라데이션 색상 |
| `workspace_activity_{wsId}` | JSON | 과거 활동 로그 캐시. 현재 대시보드는 API 우선 |
| `saved_ai_tasks` | JSON | 저장된 AI 태스크 목록 |
| `pixel_avatar_{userId}` | JSON | 개인 픽셀 아바타 설정 |
| `app_theme` | `light` \| `dark` | 개인 다크모드 설정 |
| `app_language` | `ko` \| `en` \| `zh` \| `ja` \| `ru` \| `de` | 표시 언어 설정 |

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
| `PixelAvatar` | 픽셀 학생 아바타 공통 컴포넌트. 헤더/보드/댓글/멤버/대시보드에서 프로필 표시 |
| `WorkspaceCommunityPanel` | 채널/채팅/멘션/답글/수정/삭제 커뮤니티 패널 |
| `WorkspacePlannerPanel` | dueDate 기반 캘린더/다가오는 마감일 패널 |
| `WorkspaceSwitcherPopover` | 워크스페이스 이동 팝오버 |

## 개인화/전역 설정

| 기능 | 위치 | 저장 방식 |
|---|---|---|
| 픽셀 학생 아바타 | ProfileSettings | `pixel_avatar_{userId}` localStorage |
| 다크모드 | ProfileSettings → 화면 모드 | `app_theme` localStorage, `document.documentElement.dataset.theme` |
| 언어 변경 | MainPage footer, ProfileSettings | `app_language` localStorage, `document.documentElement.lang` |

- 다크모드 전역 오버라이드는 `src/index.css`의 `:root[data-theme="dark"] ...` 구간에서 관리.
- 언어 변경은 현재 랜딩페이지와 개인정보 설정 문구에 적용됨. 앱 전체 i18n은 아직 미적용.

## CSS 규칙

- 각 페이지/컴포넌트마다 동일 이름의 `.css` 파일 사용 (예: `DashboardPage.css`)
- BEM 유사 클래스명: `dbp-` (Dashboard), `wsp-` (WorkSpace), `atp-` (AiTask), `cdm-` (CardDetailModal)

## 주의 사항

- 댓글(`CardDetailModal`)은 `team_communication` API와 연결되어 저장/조회됨. 댓글 작성 시 담당자 COMMENT 알림 전송.
- Community 채팅은 채널 생성/삭제, 답글, 수정/삭제, 멘션 자동완성/알림까지 구현됨. 같은 `team_communication` 계열 사용.
- AiTaskPage는 세션 정보를 일부 localStorage로 보존하지만, 장바구니/보드 반영은 백엔드 태스크 생성/삭제와 연결되어 있음.
- Planner 캘린더의 "다가오는 마감일"은 tasks dueDate 기반으로 표시됨.
- 활동 로그는 대시보드에서 `task_status_history` API 기반으로 표시됨.
- ProfileSettings의 `/api/users/{userId}`는 새 `UserController`가 반영된 백엔드에서만 동작함. 컨테이너 실행 중이면 재시작 필요.
