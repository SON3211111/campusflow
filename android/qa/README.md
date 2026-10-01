# Android 실행 검증

검증일: 2026-09-26 (한국 시간)

Android Studio를 설치하지 않고 Google Android SDK 명령줄 도구로 Pixel 5 형태의 Android 15(API 35, x86_64) 에뮬레이터를 실행했습니다. Windows Hypervisor Platform 가속을 사용했습니다.

## 확인 범위

`AppSmokeTest`의 계측 테스트 2개를 실제 설치한 앱에서 실행했습니다.

최종 결과: `OK (2 tests)` — [계측 테스트 출력](instrumentation-results.txt). 최종 APK 재설치 후 같은 테스트를 재실행해 통과했습니다. 검증 후 테스트 서버와 에뮬레이터는 종료했습니다.

| 시나리오 | 확인한 동작 |
|---|---|
| `demoMainFlows` | 5개 하단 탭, 업무 추가와 완료 변경, 완료 수 반영, 월간 날짜 이동, 시간표 추가/삭제, AI 예시 결과 생성과 3개 업무 등록, 프로필 이름 수정, 알림 읽음, 데모 종료 |
| `liveBackendSignupLoginAndTaskPersistence` | 기존 Spring Boot 컨트롤러로 회원가입/로그인, 업무 생성, 진행 중 상태 저장, 새로고침, 로그아웃/재로그인 후 저장 데이터 유지, Activity 재실행 후 Keystore 로그인 세션 복원 |

실제 HTTP 테스트는 격리된 H2 메모리 데이터베이스를 사용합니다. 운영 MySQL 데이터와 외부 메일/소셜 로그인 서버에는 연결하지 않습니다. AI 화면 테스트는 명시적인 데모 결과를 사용하며, 실제 Ollama 모델의 추론 품질이나 네트워크 연동을 검증한 것은 아닙니다.

화면 캡처는 `screenshots/`에 있습니다. 앱의 Android 렌더링 결과를 저장한 이미지이며 디자인 목업이 아닙니다. 계측 캡처는 앱의 루트 영역을 촬영하므로 시스템 시계/내비게이션 아이콘은 포함되지 않을 수 있습니다.

## 재현

Android SDK Platform 35, Build Tools 35.0.0, Platform Tools, 에뮬레이터와 API 35 시스템 이미지가 필요합니다. 테스트용 가상 기기를 실행하거나 별도 테스트 휴대폰을 연결합니다. **테스트는 대상 앱의 로그인 환경을 초기화하므로 일상적으로 쓰는 앱 데이터가 있는 휴대폰에서는 실행하지 마세요.**

1. `backend/`에서 분리된 테스트 서버를 실행합니다. 종료하면 테스트 DB는 사라집니다.

```powershell
.\gradlew.bat -I ../android/qa/backend.init.gradle mobileQaServer
```

2. 별도 터미널의 `android/`에서 APK를 빌드하고 설치합니다.

```powershell
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb reverse tcp:18080 tcp:18080
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell am instrument -w -r -e qaBaseUrl http://127.0.0.1:18080/api/ com.campusflow.mobile.test/androidx.test.runner.AndroidJUnitRunner
```

여러 기기가 연결되어 있으면 각 `adb` 명령에 `-s 기기ID`를 붙입니다. 정상 결과는 `OK (2 tests)`입니다. `qaBaseUrl`을 생략하면 서버 연동 테스트는 건너뛰고 데모 테스트만 실행합니다.

3. 캡처 파일을 가져옵니다.

```powershell
adb pull /sdcard/Android/data/com.campusflow.mobile/files/qa/ ./qa/screenshots/
```

에뮬레이터 검증은 실제 휴대폰 모델별 키보드·제스처·성능 테스트를 대신하지 않습니다. 이번에 검증한 범위에는 Android 8~14, 태블릿, 가로 화면, 글자 크기 확대, 네트워크 단절/복구 스트레스 테스트가 포함되지 않습니다.
