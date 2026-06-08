# Backend — Spring Boot

## 기술 스택

- Java 17, Spring Boot 3, Spring Security, JPA/Hibernate
- JWT 인증 (JwtAuthenticationFilter → TokenProvider)
- Gradle 빌드: `./gradlew bootRun` / `./gradlew build`

## 패키지 구조

```
com.campusflow/
├── config/         SecurityConfig, JwtAuthenticationFilter, TokenProvider, GlobalExceptionHandler
├── controller/     REST 컨트롤러 (1 컨트롤러 = 1 도메인)
├── service/        비즈니스 로직
├── repository/     JPA 레포지토리 (인터페이스만)
├── entity/         JPA 엔티티
│   └── enums/      TaskStatus, UserRole, UserStatus, WorkspaceRole, WorkspaceType
└── dto/            요청/응답 DTO (record 또는 class)
```

## 엔티티 관계

```
User ──< WorkspaceMember >── Workspace
                                 │
                              Task (workspace_id FK)
                                 │
                          Task (parent_id FK, 서브태스크)
                                 │
                      TaskStatusHistory (task_id FK)

User ──< ContributionMetrics >── Project
Workspace ──< Invitation
User ──< Notification
Workspace ──< TeamCommunication (task_id nullable — null이면 채팅, 있으면 댓글)
```

## 주요 ID 타입

- `User.userId` — String (UUID)
- `Workspace.workspaceId` — String (UUID), @PrePersist 자동 생성
- `Task.taskId` — String (UUID), @PrePersist 자동 생성
- `Project.projectId` — Long (auto increment)
- `ContributionMetrics.id` — Long (auto increment)

## API 패턴

모든 응답은 `ApiResponse<T>` 래퍼 사용:
```java
ApiResponse.success(200, "메시지", data)
ApiResponse.error(400, "메시지")
```

### 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /api/auth/signup | 회원가입 |
| POST | /api/auth/login | 로그인 (JWT 반환) |
| GET | /api/users/{userId} | 사용자 프로필 조회 (가입일 포함) |
| PATCH | /api/users/{userId} | 사용자 이름/비밀번호 수정 |
| GET | /api/workspaces?userId= | 워크스페이스 목록 |
| POST | /api/workspaces?userId= | 워크스페이스 생성 |
| DELETE | /api/workspaces/{id}?userId= | 워크스페이스 삭제 (owner만) |
| GET | /api/workspaces/{id}/members | 멤버 목록 |
| POST | /api/invitations/{id}/accept | 초대 수락. PERSONAL 워크스페이스에 멤버 추가 시 TEAM 전환 |
| GET | /api/workspaces/{id}/tasks | 활성 태스크 목록 |
| POST | /api/workspaces/{id}/tasks | 태스크 생성 |
| PATCH | /api/workspaces/{id}/tasks/{taskId}/status?status= | 상태 변경 |
| PATCH | /api/workspaces/{id}/tasks/{taskId}/description | 설명 수정 |
| PATCH | /api/workspaces/{id}/tasks/{taskId}/due-date?dueDate= | 마감일 수정 |
| DELETE | /api/workspaces/{id}/tasks/{taskId} | 소프트 삭제 |
| GET | /api/workspaces/{id}/tasks/trash | 휴지통 조회 |
| PATCH | /api/workspaces/{id}/tasks/{taskId}/restore | 복원 |
| GET | /api/workspaces/{id}/tasks/activity?limit= | 상태 변경 활동 피드 |
| GET | /api/workspaces/{id}/tasks/bottleneck?days= | 병목 태스크 조회 |
| GET | /api/workspaces/{id}/tasks/bottleneck-report?days= | 병목/후속 일정 지연 리포트 |
| GET | /api/notifications?userId= | 미읽 알림 조회 |
| GET | /api/notifications?userId=&workspaceId= | 워크스페이스 필터가 적용된 알림 조회 |
| POST | /api/notifications/{id}/read | 알림 읽음 처리 |
| POST | /api/workspaces/{id}/messages | 댓글/채팅 저장 |
| GET | /api/workspaces/{id}/messages | 댓글/채팅 조회 (taskId 파라미터로 댓글/채팅 구분) |
| GET | /api/projects/{id}/analytics/progress | 진행률 (현재 더미) |
| GET | /api/projects/{id}/analytics/contributions | 기여도 |

**향후 구현/정리 예정 엔드포인트**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /api/workspaces/{id}/tasks?assigneeId=null | Pool 태스크 조회 (Picking용) |
| PATCH | /api/workspaces/{id}/tasks/{taskId}/pick | Picking — is_locked + assigneeId 처리 |
| POST | /api/issues | Issue Inbox 전환용 Issue upsert |
| GET | /api/workspaces/{id}/issues | Issue Inbox 목록 |

## Task 상태 흐름

```
TODO → REVIEW → DOING → DONE
              ↘ ISSUE ↗
```

프론트엔드 컬럼명 매핑:
- "상태 없음" = TODO
- "시작하지 않음" = REVIEW
- "진행 중" = DOING
- "보류 중" = ISSUE
- "완료" = DONE

## 코딩 규칙

- 서비스 레이어에서 `@Transactional` 명시 (readOnly = true 적극 사용)
- LAZY 로딩 엔티티는 반드시 트랜잭션 안에서 DTO 변환 (`TaskResponse.from(task)`)
- 소프트 삭제: `deleted = true`, `deletedAt = LocalDateTime.now()`
- 새 컨트롤러 추가 시 `GlobalExceptionHandler`의 예외 처리 패턴 따를 것
- 프로필 조회/수정은 `UserController`에서 처리. 비밀번호 변경 시 currentPassword 검증 후 BCrypt 인코딩 저장.
- `User.createdAt`이 과거 데이터에서 null이면 UserController 응답에서 소유 워크스페이스 생성일을 가입일 fallback으로 사용.
- `WorkspaceService.joinWorkspace`는 PERSONAL 워크스페이스에 새 멤버가 추가되면 type을 TEAM으로 전환.

## 주의 사항

- `ProjectAnalyticsService.getOverallProgress()` — 항상 0 반환하는 더미, 실제 구현 필요
- AI 서비스 호출은 `AiService`를 통해 백엔드 → AI(포트 8000) 프록시 방식
- `api/auth.ts`의 `/users/me`, `/auth/logout` 엔드포인트 백엔드 미구현 — 프론트에서 호출 시 404
- `TaskBreakdownPage.tsx` AI 응답 null 체크 없음 — AI 응답 실패 시 런타임 에러 가능
- 새 컨트롤러 파일을 추가한 뒤 실행 중인 Docker 백엔드가 자동 재시작되지 않으면 프론트에서 `NoResourceFoundException: No static resource api/...`가 발생할 수 있음. 컨테이너 재시작 필요.
