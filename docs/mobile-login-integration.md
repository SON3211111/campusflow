# 모바일·간편 로그인 통합

기준: origin/feature/ai-task (9d24493). origin/feature/mobile-fix (953c3c7)를 병합하고,
feature/ez의 b5ca2d0에서 네이버·카카오 웹 OAuth 코드만 선별했습니다.
Android 데모와 테스트는 유지합니다. 이메일 인증 강제, 다른 AI 변경, 운영 배포 파일은 가져오지 않았습니다.

## 실행

- Android: 이 작업 공간의 android 폴더를 Android Studio에서 열고 JDK 21로 실행합니다.
- 백엔드와 웹도 함께 배포해야 상태 변경 응답(Task 데이터)과 동기화가 맞습니다.
- Android 기본 API: http://54.241.203.16:5173/api/
- 이번 변경은 웹의 간편 로그인입니다. Android 네이티브 OAuth 콜백은 포함하지 않습니다.

## 네이버·카카오 설정

기본 실행에서는 OAuth가 꺼져 있고 일반 로그인/회원가입, 데모는 사용할 수 있습니다.
서버 환경변수에 아래 값을 설정한 다음 백엔드를 다시 실행하세요.
기존 docker-compose.yml은 backend의 .env를 읽으므로 같은 변수들을 .env에 추가할 수 있습니다.
실제 키는 Git에 커밋하지 않습니다.

```dotenv
SPRING_PROFILES_ACTIVE=oauth
FRONTEND_URL=http://54.241.203.16:5173
OAUTH_REDIRECT_BASE_URL=http://54.241.203.16:5173
NAVER_CLIENT_ID=설정필요
NAVER_CLIENT_SECRET=설정필요
KAKAO_REST_API_KEY=설정필요
KAKAO_CLIENT_SECRET=설정필요
```

두 제공자 등록을 함께 사용하는 프로필이므로 양쪽 키를 설정해야 합니다.
실제 서비스의 등록 도메인/허용 URL 정책에 맞는 공개 주소를 사용하세요.
등록할 콜백 경로:
- /login/oauth2/code/naver
- /login/oauth2/code/kakao

Vite는 /oauth2 및 /login/oauth2 요청을 백엔드에 프록시합니다.
다른 운영 프록시를 사용하면 /api, /ws와 함께 이 두 경로도 백엔드로 전달해야 합니다.
리다이렉트 기준 주소는 브라우저가 접근 가능한 주소로 명시합니다.

회원 모델에 nullable password, oauth_provider_id가 추가됩니다.
운영 DB 스키마 변경 전 백업 후 기존 배포의 ddl-auto/마이그레이션 정책을 확인하세요.
같은 이메일의 일반 계정과 소셜 계정을 자동 연결하지 않습니다. 기존 계정은 비밀번호로 로그인합니다.
비활성 계정에는 토큰을 발급하지 않습니다. 로그인 결과 토큰은 쿼리 대신 URL fragment로 전달하고 웹에서 제거합니다.

## 동기화 범위

mobile-fix의 STATUS_CHANGE/TASK_UPDATED 수신과 3초 재연결을 유지합니다.
생성/삭제/복원/제목 변경 등 미처리 이벤트는 기존 주기 조회로 반영됩니다.
첨부파일은 목록 조회만 지원합니다. 모바일 업로드/다운로드는 포함하지 않습니다.
명시적인 상태 변경은 기본 칸으로 이동하며 같은 상태를 재선택해도 사용자 지정 칸에서 기본 칸으로 이동합니다.

## 검증 범위

웹 production build, Android debug 빌드·단위 테스트, 백엔드 H2 테스트를 실행합니다.
OAuth 테스트는 기존/신규/비활성/이메일 충돌 계정 처리와 프로필 설정을 검증하며 외부 제공자에 접속하지 않습니다.
실제 제공자 인증, 운영 DB 마이그레이션과 기기 간 실시간 수동 시연은 별도 검증이 필요합니다.
android/qa의 기존 UI 테스트 기록은 이번 통합의 실행 결과가 아닌 과거 기록입니다.
