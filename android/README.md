# CampusFlow Android

기존 CampusFlow 웹 서비스와 같은 Spring Boot API/DB를 사용하는 Kotlin + Jetpack Compose 네이티브 앱입니다. Android Studio에서 **이 `android` 폴더**를 프로젝트로 여세요. 기존 `frontend`는 웹 앱으로 유지됩니다.

## 실행

1. Android Studio와 Android SDK Platform 35 / Build Tools 35.0.0을 설치합니다.
2. Gradle JDK를 17 이상으로 설정합니다. 이 저장소의 백엔드는 JDK 21을 사용합니다.
3. Android Studio에서 `android/`를 열고 Gradle Sync를 실행합니다.
4. Android 8.0(API 26) 이상 에뮬레이터 또는 휴대폰에서 `app`을 실행합니다.
5. 기본 API 주소는 팀 서버 `http://54.241.203.16:5173/api/`입니다. Debug APK에서는 별도 입력 없이 사용합니다. 서버의 실제 `/api/` 라우팅과 접속 가능 여부는 배포 환경에서 확인해야 합니다. 현재 HTTP 주소는 Release의 HTTPS 전용 정책과 호환되지 않습니다.
   다른 서버를 사용할 때만 로그인 화면의 **서버 연결 설정**에서 `/api/`로 끝나는 주소를 저장합니다.
   - Android 에뮬레이터 → PC 서버: `http://10.0.2.2:8080/api/`
   - USB 연결 휴대폰: `adb reverse tcp:8080 tcp:8080` 실행 후 `http://127.0.0.1:8080/api/`
   - Wi-Fi 휴대폰: PC와 같은 네트워크에서 `http://PC의-LAN-IP:8080/api/`
   - 운영 서버: `https://서버주소/api/`
6. 웹 계정으로 로그인하거나 앱에서 회원가입합니다. 기존 백엔드와 DB가 실행 중이어야 합니다.

HTTP는 debug 빌드에만 허용됩니다. Release는 HTTPS를 사용합니다. 서버 주소를 바꾸려면 로그아웃 후 연결 설정을 변경합니다. 키보드가 입력창을 가리지 않도록 입력 폼에는 스크롤과 IME inset을 적용했습니다.

로그인 및 데이터 저장에는 실제 서버 연결이 필요합니다. 서버 연결 실패 시 오류가 표시됩니다.

## 구현한 기능

| 영역 | 동작 |
|---|---|
| 인증 | 이메일 형식/비밀번호 입력 검증, 회원가입, 웹 계정 로그인, 401 재로그인, 로그아웃 |
| 홈 | 선택한 팀의 내 업무, 팀 완료 수, 오늘 반복 일정, 마감 D-Day |
| 시간표 | 월간/주간 날짜 이동, 오늘 이동, 요일별 반복 일정 추가/삭제, 선택한 팀 업무의 마감일 표시 |
| AI | 프로젝트 설명 검증, 실제 AI API 호출, fallback 표시, 결과 제목 편집, 체크 선택, 팀 보드 등록 |
| 워크스페이스 | 목록/전환/생성, 멤버 및 OWNER/MEMBER 조회, 상태별 보드 필터, 내 업무 필터, 업무 생성/상태 변경 |
| 알림 | 최신순 조회, 읽음 처리, 참여 요청 안내 문구 |
| 마이페이지 | 프로필 조회/이름 변경, 참여 공간 수, 완료한 내 업무 수 |
| 공통 | 시스템 다크 모드, Material 3, 하단 탭 포커스, Bottom Sheet 입력, 로딩/오류/빈 상태 |

화면이 활성 상태일 때 30초 간격으로 조회하며 수동 새로고침도 가능합니다. WebSocket 기반 즉시 동기화나 백그라운드 푸시 알림을 구현한 것은 아닙니다. 홈/보드/마감일은 **현재 선택한 워크스페이스** 기준이며 시간표는 로그인한 사용자의 전체 반복 시간표입니다.

AI 결과를 등록하면 기존 업무 API로 저장되어 웹/앱에서 공유됩니다. 등록 전 임시 결과는 ViewModel에 있어 화면 회전에는 유지되지만, 프로세스 종료/로그아웃 시 사라집니다. 일괄 등록 중 일부 실패 시 성공 응답을 받은 항목은 즉시 제거하여 다시 전송하지 않습니다. 서버가 저장했지만 응답이 끊긴 경우는 기존 API에 idempotency key가 없어 보드 확인 후 재시도해야 합니다.

## 프로젝트 구조

```text
app/src/main/java/com/campusflow/mobile/
  MainActivity.kt              테마와 앱 진입점
  AppViewModel.kt              상태, 세션, 데이터 갱신, 사용자 동작
  data/
    Models.kt                  기존 DTO 대응 모델과 입력 검증
    CampusApi.kt               Retrofit 엔드포인트와 Bearer 인증
    SessionStore.kt            Android Keystore AES-GCM 세션 저장
  ui/
    CampusApp.kt               5단 탭, Bottom Sheet, 알림, 업무 상세
    Screens.kt                 로그인/홈/시간표/AI/보드/프로필
    Forms.kt                   등록/수정 폼
    Components.kt              공통 카드와 버튼
```

일반 API는 `{status,message,data}`를 사용하지만 `schedules` API는 래퍼 없는 배열/객체입니다. 실제 백엔드 컨트롤러의 응답 구조에 맞춰 각각 처리했습니다. API 키나 비밀번호는 소스에 포함하지 않으며 로그인 토큰은 Android Keystore로 암호화하고 앱 백업은 비활성화했습니다.

## 검증 명령

Windows PowerShell (`android` 폴더):

```powershell
.\gradlew.bat :app:assembleDebug :app:lintDebug
```

macOS/Linux:

```sh
sh gradlew :app:assembleDebug :app:lintDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## 참고 계획서 대비 후속 범위

참고 문서의 전체 학기 개발 계획 중 아래 기능은 이 앱 모듈에 아직 구현하지 않았습니다. UI에 동작하지 않는 소셜 로그인 버튼이나 가짜 인증 완료 표시는 넣지 않았습니다.

- 이메일 인증 메일 발송·확인, Naver/Kakao OAuth: 제공자 앱 등록, 리다이렉트 URI, 서버 연동 필요.
- 워크스페이스 연결, 멤버 역할 변경, 관리자 API 권한 강제: 현재 서버의 일반 엔드포인트 권한 검증부터 보완 필요. 앱은 역할을 표시하며 관리 권한 변경/추방 기능은 노출하지 않습니다.
- AI 결과의 등록 전 공동 편집·열람 추적·실시간 장바구니: 현재는 체크 선택 후 팀 보드에 등록하여 공유합니다. 기존 웹 AI 세션을 덮어쓰지 않습니다.
- 날짜별 단발 일정, 날짜 범위 Drag & Drop, 팀 일정 생성: 기존 시간표 API는 `dayOfWeek/startTime/endTime`만 제공하여 우선 반복 시간표와 Task 마감일을 연결했습니다.
- 태그 편집, 푸시 알림, 첨부파일/댓글/채팅, 오프라인 편집 동기화.

서버 변경은 `AiController`의 20~4,000자 및 단순 반복/기호 입력 차단, `TaskService`의 상태 변경 시 옛 `boardColumn` 초기화가 적용되어 있습니다. 명시적인 상태 변경 요청은 같은 상태라도 해당 기본 칸으로 이동합니다. 기존 웹 클라이언트에도 동일한 입력 검증이 적용되므로 백엔드를 다시 빌드/시작해야 합니다.

기술 설정 참고: [Android Gradle Plugin 8.9 호환성](https://developer.android.com/build/releases/agp-8-9-0-release-notes), [Compose Compiler 플러그인 설정](https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler).


## 통합 브랜치 안내
현재 브랜치는 업무 상세·댓글·첨부파일 목록·알림센터·WebSocket 수신을 추가했습니다. 데모 모드와 테스트 소스·의존성은 제거했습니다. 위 과거 검증 기록 및 후속 범위보다 [통합 안내](../docs/mobile-login-integration.md)를 우선 참고하세요.


## 이메일 인증 가입

신규 가입 시 인증번호 발송 → 메일의 6자리 번호 확인 → 회원가입 순서로 진행합니다. 서버 SMTP 설정과 새 백엔드 배포가 필요합니다. 기존 계정 로그인은 그대로 사용할 수 있습니다. 설정은 `../docs/mobile-login-integration.md`를 참고하세요.


## 모바일 협업 기능 추가

- 알림 아이콘 → **병목 리포트**: 웹과 같은 `/tasks/bottleneck-report?days=3` 결과로 정체 일수, 최대 예상 지연, 기준/예상 마감, 직접·간접 후속 영향을 표시합니다. 펼친 카드에서 업무 상세로 이동할 수 있습니다. 병목 알림 개수와 리포트 업무 개수는 별도입니다.
- 알림센터 또는 워크스페이스 선택창 → **팀 초대·참여**: 이메일 초대, 받은 초대 수락·거절, 워크스페이스 ID/웹 초대 링크로 참여 요청, 관리자 참여 승인·거절을 지원합니다.
- 업무 상세 → **첨부파일**: 시스템 파일 선택기로 최대 50MB 파일을 업로드합니다. 저장 위치 선택 후 인증 API로 다운로드하고, 확인창을 거쳐 첨부파일을 삭제합니다.
- 업무 상세 → **제목 저장 / 업무 삭제**: 제목을 수정하거나 업무를 휴지통으로 이동합니다. 워크스페이스 선택창 → **현재 팀 휴지통**에서 복원합니다. 앱에서 업무 영구 삭제는 제공하지 않습니다.

새 기능은 실제 계정과 서버 데이터를 사용합니다. 현재 서버 API를 재사용하며 서버 코드 변경은 없습니다.

검증: Android `assembleDebug` 및 `lintDebug` 통과. 실제 운영 서버에서 두 계정의 초대·승인, 파일 업로드/저장/삭제, 웹과 앱의 업무 수정·삭제·복원 결과는 별도 실기기 확인이 필요합니다.
