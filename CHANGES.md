# CampusFlow 코드 리뷰 & 수정 내역

> 브랜치: `fix/intergration`  
> 기준 브랜치: `test/integration` (모든 feature 브랜치 머지 후)  
> 최종 업데이트: 2026-05-12

---

## 수정 배경

`feature/frontend`, `feature/backend`, `feature/ai`, `feature/backendAI` 네 브랜치를 `test/integration`으로 머지한 뒤,  
랜딩 → 로그인 → 회원가입 → 워크스페이스 전체 플로우를 검토하여 발견한 버그와 미연결 코드를 수정했습니다.

---

## 수정 목록

### 🔴 Critical (기능이 작동하지 않는 버그)

#### 1. 워크스페이스 목록 조회 — LazyInitializationException
- **파일**: `backend/.../service/WorkspaceService.java`
- **원인**: `findAllByUserId()`에서 LAZY 로딩된 `WorkspaceMember.getWorkspace()`를 트랜잭션 밖에서 호출
- **수정**: `@Transactional(readOnly = true)` 추가

#### 2. Hibernate 프록시 JSON 직렬화 오류
- **파일**: `backend/.../entity/Workspace.java`
- **원인**: LAZY 로딩된 엔티티가 `ByteBuddyInterceptor` 프록시로 반환되어 Jackson이 직렬화 실패
- **수정**: `@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})` 추가

#### 3. 워크스페이스 `id` 필드 — JSON 직렬화 불일치
- **파일**: `backend/.../entity/Workspace.java`
- **원인**: 엔티티 필드명이 `workspaceId`라서 JSON에도 `workspaceId`로 직렬화됨. 프론트는 `ws.id`로 읽어서 항상 `undefined`
- **수정**: `@JsonProperty("id")` 추가

#### 4. 워크스페이스 생성 시 owner 미설정 + WorkspaceMember 미생성
- **파일**: `backend/.../service/WorkspaceService.java`
- **원인**: 기존 `createTeamWorkspace()`가 `owner` 없이 워크스페이스만 저장. `WorkspaceMember`도 생성 안 함
- **결과**: 생성한 워크스페이스가 목록 조회에서 안 나옴
- **수정**: `createWorkspace()`로 통합, owner 설정 + WorkspaceMember(OWNER) 함께 생성

#### 5. 워크스페이스 목록 조회 — owner 기반 쿼리로 멤버 워크스페이스 누락
- **파일**: `backend/.../service/WorkspaceService.java`, `WorkspaceMemberRepository.java`
- **원인**: `findAllByOwner_UserId()`는 내가 직접 만든 워크스페이스만 반환. 다른 사람이 만든 팀 워크스페이스에 멤버로 참여해도 안 보임
- **수정**: `WorkspaceMemberRepository`에 `findAllByUser_UserId()` 추가, 멤버 테이블 기반으로 조회로 변경

#### 6. 워크스페이스 삭제 — FK 제약 조건 오류
- **파일**: `backend/.../service/WorkspaceService.java`, `WorkspaceMemberRepository.java`
- **원인**: `workspaceRepository.deleteById()` 호출 시 `workspace_member` 테이블에 FK 참조가 남아 있어 오류 발생
- **수정**: `deleteAllByWorkspace_WorkspaceId()` 추가, 삭제 전 멤버 먼저 제거

#### 7. Docker 환경에서 API 호출 실패 (ECONNREFUSED)
- **파일**: `frontend/vite.config.ts`, `docker-compose.yml`
- **원인**: Vite 프록시 타겟이 `http://localhost:8080`으로 고정. Docker에서는 frontend 컨테이너 내부의 `localhost`가 backend를 가리키지 않음
- **수정**: `vite.config.ts`에서 `process.env.API_TARGET`으로 변경, `docker-compose.yml`에 `API_TARGET=http://backend:8080` 추가

#### 8. 프론트 API 호출 — `http://localhost:8080` 하드코딩
- **파일**: `frontend/src/pages/Login.tsx`, `frontend/src/pages/UserSetup.tsx`
- **원인**: `fetch('http://localhost:8080/api/...')`로 절대경로 하드코딩. `api/client.ts`(Axios 인스턴스)가 이미 있었으나 사용 안 함
- **수정**: `api/auth.ts`의 `login()`, `signup()` 함수로 교체

#### 9. 워크스페이스 화면 — 더미 데이터, API 미연결
- **파일**: `frontend/src/ListPages/WorkspaceList.tsx`
- **원인**: `DEFAULT_TEAM`(한글 자모 더미)으로 하드코딩, 마운트 시 API 조회 없음
- **수정**: 마운트 시 `GET /api/workspaces?userId=...` 호출, 생성 시 `POST /api/workspaces` 호출 후 응답값으로 state 업데이트

---

### 🟡 Important (UX 문제)

#### 10. 인증 없이 /workspace 직접 접근 가능
- **파일**: `frontend/src/App.tsx`
- **원인**: `PrivateRoute` 없음. 로그인 안 해도 URL 직접 입력으로 진입 가능
- **수정**: `PrivateRoute` 컴포넌트 추가. `localStorage`에 `accessToken` 없으면 `/login`으로 리다이렉트

#### 11. 회원가입 후 자동 로그인 없음
- **파일**: `frontend/src/pages/UserSetup.tsx`
- **원인**: 가입 성공 후 `/login`으로 이동. 사용자가 다시 로그인해야 함
- **수정**: 가입 성공 직후 `login()` 호출로 자동 로그인 → `/workspace`로 이동

#### 12. /usersetup 직접 접근 시 이메일 없이 가입 API 호출
- **파일**: `frontend/src/pages/UserSetup.tsx`
- **원인**: `Signup.tsx`를 거치지 않고 직접 URL 입력 시 `localStorage.signupEmail`이 없어 빈 이메일로 API 호출
- **수정**: `useEffect`에서 email 없으면 `/signup`으로 리다이렉트

#### 13. 로그인 세션이 메인 랜딩 페이지에 반영 안 됨
- **파일**: `frontend/src/pages/MainPage.tsx`, `frontend/src/components/Header.tsx`
- **원인**: `MainPage`가 별도 `<header>` 태그를 직접 렌더링해서 로그인 상태를 반영하지 않음
- **수정**: 공용 `Header` 컴포넌트로 교체. 로그인 상태 시 유저 이름 + 드롭다운 메뉴 표시

#### 14. 로고 클릭 → 메인 화면 이동 없음 (로그인/회원가입 페이지)
- **파일**: `frontend/src/pages/Login.tsx`, `frontend/src/pages/Signup.tsx`, `frontend/src/pages/UserSetup.tsx`
- **원인**: 로고에 클릭 이벤트 없음
- **수정**: `onClick={() => navigate('/')}` 추가

#### 15. 비밀번호 눈 아이콘 — 동작 안 함
- **파일**: `frontend/src/pages/Login.tsx`, `frontend/src/pages/UserSetup.tsx`
- **원인**: `<img>` 태그만 있고 `onClick` 없음. `input type`이 항상 `password`로 고정
- **수정**: `showPassword` state 추가, 클릭 시 `type="text"` ↔ `type="password"` 토글

#### 16. 로그아웃 기능 없음
- **파일**: `frontend/src/components/Header.tsx`
- **원인**: 헤더에 로그아웃 UI 없음. `localStorage` 토큰을 지울 방법이 없었음
- **수정**: 유저 아바타 클릭 시 드롭다운 메뉴(내 워크스페이스 / 개인정보 설정 / 로그아웃) 표시

#### 17. 워크스페이스 삭제 버튼 없음
- **파일**: `frontend/src/components/WorkspaceCard.tsx`, `frontend/src/ListPages/WorkspaceList.tsx`
- **원인**: 카드에 삭제 수단 없음. `confirm()` 브라우저 다이얼로그 사용
- **수정**:
  - 카드 호버 시 ✕ 버튼 표시 (`onDelete` prop)
  - 사이드바 서브메뉴에 🗑 삭제 항목 추가
  - 브라우저 `confirm()` 대신 커스텀 팝업 모달로 교체 (취소 / 삭제)

#### 18. 워크스페이스 색상 — UUID에서 NaN 오류
- **파일**: `frontend/src/ListPages/WorkspaceList.tsx`
- **원인**: `randomGradient(id)`에서 UUID 문자열을 숫자로 변환 시 `NaN`이 되어 카드 색상이 없어짐
- **수정**: 문자 코드 합산(charCodeAt) 방식으로 변경

#### 19. 개인 워크스페이스 생성 시 TEAM으로 저장되는 버그
- **파일**: `backend/.../controller/WorkspaceController.java`, `frontend/src/ListPages/WorkspaceList.tsx`
- **원인**: 백엔드가 항상 `type = "TEAM"`으로 고정 생성
- **수정**: `WorkspaceRequest`에 `type` 필드 추가. 프론트에서 섹션에 따라 `"TEAM"` / `"PERSONAL"` 전달

#### 20. 중복 워크스페이스 이름 허용
- **파일**: `frontend/src/ListPages/WorkspaceList.tsx`
- **원인**: 이름 중복 검사 없음
- **수정**: 생성 전 기존 워크스페이스 이름 목록과 비교해 중복 시 생성 차단

#### 21. 보드 페이지 — 나가기/저장 버튼 없음
- **파일**: `frontend/src/ListPages/BoardPage.tsx`
- **원인**: 보드 페이지에서 나가는 방법이 사이드바 맨 하단 Home 버튼뿐이라 인지가 어려움. 저장 버튼 없음
- **수정**: 상단 액션바에 `← 뒤로가기` / `삭제` / `저장` 버튼 추가

#### 22. 보드 페이지 — 다른 워크스페이스 보드 클릭 시 화면 미갱신
- **파일**: `frontend/src/ListPages/BoardPage.tsx`
- **원인**: 같은 `/board` 경로에서 state만 바뀌면 컴포넌트가 재마운트되지 않아 `wsName`, `wsBg` 등 state가 이전 워크스페이스 값으로 유지됨
- **수정**: `useEffect([workspace.id])`로 워크스페이스 변경 시 state 초기화

#### 23. 보드 페이지 — 변경사항 있을 때 이동 시 경고 없음
- **파일**: `frontend/src/ListPages/BoardPage.tsx`
- **원인**: 이름 수정 또는 템플릿 선택 후 사이드바 클릭 시 변경사항이 경고 없이 사라짐
- **수정**: `isDirty` 감지 후 이동 시 확인 모달 표시 — **취소 / 저장 안 함 / 저장 후 이동** 세 가지 선택

#### 24. 보드 페이지 — 워크스페이스 이름 수정 시 백엔드 미저장
- **파일**: `backend/.../controller/WorkspaceController.java`, `backend/.../service/WorkspaceService.java`
- **원인**: 이름 수정 API 없음. 보드에서 이름 변경해도 새로고침 시 원래 이름으로 돌아옴
- **수정**: `PATCH /api/workspaces/{id}` 엔드포인트 추가

---

### 🟠 Minor

#### 25. `api/project.ts` — 이중 `/api` 경로 버그
- **파일**: `frontend/src/api/project.ts`
- **원인**: `client`의 `baseURL`이 `/api`인데 경로에도 `/api/projects`로 작성 → 실제 요청이 `/api/api/projects`로 전송됨
- **수정**: `/api/projects` → `/projects`

#### 26. `@CrossOrigin` 중복 선언
- **파일**: `backend/.../controller/AuthController.java`, `backend/.../controller/WorkspaceController.java`
- **원인**: `SecurityConfig`에 전역 CORS 설정이 있는데 컨트롤러에도 `@CrossOrigin` 중복 선언
- **수정**: 컨트롤러의 `@CrossOrigin` 제거

#### 27. 로그인 UX 개선
- **파일**: `frontend/src/pages/Login.tsx`
- Enter 키로 로그인 가능하도록 `onKeyDown` 추가
- API 호출 중 버튼 비활성화(로딩 상태) 추가

---

### 2026-05-12 추가 수정

#### 28. 보드 템플릿 변경 시 색상이 저장되지 않는 버그
- **파일**: 아래 표 참고
- **원인**:
  - 백엔드 `Workspace` 엔티티에 `gradient` 컬럼 자체가 없어 저장 불가
  - `saveChanges()`가 이름이 바뀌지 않으면 즉시 `return true` 종료 → 색상만 변경 시 아무것도 저장 안 됨
  - 저장 API body에 `gradient` 미포함
  - `WorkspaceList.tsx`에서 gradient를 백엔드에서 읽지 않고 ID 기반으로 클라이언트에서 임의 생성

| 파일 | 변경 사항 |
|---|---|
| `backend/.../entity/Workspace.java` | `gradient` 컬럼 추가 (varchar 512), getter/setter 추가 |
| `backend/.../controller/WorkspaceController.java` | `WorkspaceRequest`에 `gradient` 필드 추가, PATCH 핸들러를 `updateWorkspace`로 변경 |
| `backend/.../service/WorkspaceService.java` | `renameWorkspace` → `updateWorkspace`로 변경, name·gradient 동시 업데이트 지원 |
| `frontend/.../ListPages/BoardPage.tsx` | `saveChanges()`에서 `isDirty` 기반 체크로 변경, `gradient: wsBg` 포함해서 API 전송 |
| `frontend/.../ListPages/WorkspaceList.tsx` | 워크스페이스 목록 조회 시 백엔드 `gradient` 우선 사용, 없을 경우에만 랜덤 생성 |

> `spring.jpa.hibernate.ddl-auto=update` 설정으로 백엔드 재시작 시 `workspaces` 테이블에 `gradient` 컬럼이 자동 추가됩니다.

#### 29. 전체 페이지 반응형 웹 적용
- **브레이크포인트**: `≤ 1024px` (소형 데스크탑), `≤ 768px` (태블릿), `≤ 480px` (모바일)

| 파일 | 반응형 처리 내용 |
|---|---|
| `Header.css` | 검색창 너비 축소 (1024px), static 배치로 전환 (768px), 모바일에서 검색창 숨김 (480px) |
| `WorkspaceList.css` | 사이드바 너비 축소 (1024px), 768px 이하에서 상단 수평 바로 전환, 카드 간격 조정, 모달 너비 유동화 |
| `BoardPage.css` | 템플릿 썸네일 단계별 축소, 액션바·헤더·섹션 타이틀 폰트·패딩 조정 |
| `WorkspaceCard.css` | 카드 너비 200 → 160px (768px) → 140px (480px) |
| `Login.css` | 768px 이하에서 광고 사이드바 숨김, 로그인 카드 전체 너비 전환 |
| `Signup.css` | 768px 이하에서 광고 사이드바 숨김, `position: fixed` 해제, 카드 전체 너비 전환 |
| `MainPage.css` | 버튼 그룹 세로 정렬, 섹션 너비 유동화, 업무분담 박스 세로 스택 전환, 푸터 패딩 조정 |

---

## 변경 파일 목록

### 백엔드
| 파일 | 변경 내용 |
|---|---|
| `entity/Workspace.java` | `@JsonProperty("id")`, `@JsonIgnoreProperties` 추가, `gradient` 컬럼 추가 |
| `repository/WorkspaceMemberRepository.java` | `findAllByUser_UserId()`, `deleteAllByWorkspace_WorkspaceId()` 추가 |
| `service/WorkspaceService.java` | `@Transactional` 추가, owner 설정, 멤버 기반 조회, `createWorkspace()` 통합, `updateWorkspace()` 추가 |
| `controller/WorkspaceController.java` | `type`·`gradient` 파라미터 추가, `PATCH /{id}` 추가, `DELETE /{id}` 추가, `@CrossOrigin` 제거 |
| `controller/AuthController.java` | `@CrossOrigin` 제거 |

### 프론트엔드
| 파일 | 변경 내용 |
|---|---|
| `src/App.tsx` | `PrivateRoute` 추가 |
| `src/pages/Login.tsx` | `client.ts` 사용, 눈 아이콘 토글, Enter 로그인, 로딩 상태, 로고 클릭 네비게이션 |
| `src/pages/Signup.tsx` | 로고 클릭 네비게이션 추가 |
| `src/pages/UserSetup.tsx` | `client.ts` 사용, 이메일 가드, 자동 로그인, 눈 아이콘 토글, 로고 클릭 네비게이션 |
| `src/pages/MainPage.tsx` | 공용 `Header` 컴포넌트 교체, 로그인 세션 반영 |
| `src/ListPages/WorkspaceList.tsx` | API 연결, CRUD, 삭제 모달, 중복 이름 방지, 색상 수정, 백엔드 gradient 우선 사용 |
| `src/ListPages/WorkspaceList.css` | 삭제 모달 CSS, 사이드바 삭제 항목 CSS, 반응형 미디어 쿼리 추가 |
| `src/ListPages/BoardPage.tsx` | 뒤로가기/저장/삭제 버튼, 변경사항 감지 모달, 다른 보드 이동 시 state 초기화, gradient 저장 수정 |
| `src/ListPages/BoardPage.css` | 액션바, 삭제 버튼 CSS, 반응형 미디어 쿼리 추가 |
| `src/components/Header.tsx` | 유저 드롭다운 + 로그아웃, 로그인/비로그인 분기 |
| `src/components/Header.css` | 드롭다운, 로그인 버튼 CSS, 반응형 미디어 쿼리 추가 |
| `src/components/WorkspaceCard.tsx` | 호버 시 삭제(✕) 버튼 추가 |
| `src/components/WorkspaceCard.css` | 삭제 버튼 CSS, 반응형 미디어 쿼리 추가 |
| `src/api/project.ts` | 이중 `/api` 경로 수정 |
| `src/pages/Login.css` | 반응형 미디어 쿼리 추가 |
| `src/pages/Signup.css` | 반응형 미디어 쿼리 추가 |
| `src/pages/MainPage.css` | 반응형 미디어 쿼리 추가 |
| `vite.config.ts` | 프록시 타겟 환경변수화 |

### Docker
| 파일 | 변경 내용 |
|---|---|
| `docker-compose.yml` | frontend에 `API_TARGET=http://backend:8080` 추가 |

---

## 아직 미구현 (향후 작업)

- **JWT 인증 필터**: 현재 모든 API가 `permitAll()`. `userId`를 클라이언트가 직접 전달하는 방식으로, JWT 토큰에서 서버 측 추출 필요
- **이메일 인증**: `/mailcode` 라우트가 있으나 회원가입 플로우에 미연결
- **소셜 로그인**: Google / Naver / Microsoft 버튼 UI만 있고 기능 없음
- **워크스페이스 참여 기능**: "워크스페이스 참여 !" 버튼 UI만 존재