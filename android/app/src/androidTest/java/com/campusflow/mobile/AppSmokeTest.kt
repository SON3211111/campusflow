package com.campusflow.mobile

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File

/** Executes the actual Android screens; the live test uses an isolated local QA backend. */
class AppSmokeTest {
    @get:Rule val compose = createEmptyComposeRule()
    private lateinit var scenario: ActivityScenario<MainActivity>

    @Before fun launch() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        context.getSharedPreferences("campusflow", Context.MODE_PRIVATE).edit().clear().commit()
        scenario = ActivityScenario.launch(MainActivity::class.java)
    }
    @After fun close() { scenario.close() }

    private fun click(text: String) {
        val matcher = hasText(text) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)
        compose.waitUntil(20_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().size == 1 }
        compose.onNode(matcher).performScrollTo().performClick()
    }
    private fun openTask(title: String) {
        val matcher = hasText(title) and hasClickAction() and !hasSetTextAction()
        compose.waitUntil(20_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().size == 1 }
        compose.onNode(matcher).performClick()
        waitFor("업무 상태")
    }
    private fun fill(label: String, value: String) = compose.onNode(hasSetTextAction() and hasText(label)).performTextReplacement(value)
    private fun tab(label: String) = compose.onNodeWithContentDescription(label, useUnmergedTree = true).performClick()
    private fun waitFor(text: String) = compose.waitUntil(20_000) {
        compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()
    }
    private fun back() { InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK) }
    private fun screenshot(name: String) {
        compose.waitForIdle()
        val directory = InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir("qa")!!
        directory.mkdirs()
        File(directory, "$name.png").outputStream().use {
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }

    @Test fun demoMainFlows() {
        click("데모로 먼저 둘러보기")
        waitFor("캠퍼스님, 반가워요 👋")
        screenshot("01-home")

        tab("워크스페이스")
        compose.onNodeWithText("업무 추가").performClick()
        fill("업무 제목", "모바일 실행 검증")
        fill("업무 설명", "에뮬레이터에서 실제 화면과 저장 동작을 확인합니다.")
        click("업무 등록")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("모바일 실행 검증"))
        openTask("모바일 실행 검증")
        click("완료")
        waitFor("✓  완료")
        back()
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("완료 2 / 4"))
        compose.onNodeWithText("완료 2 / 4").assertExists()
        screenshot("02-workspace")

        tab("시간표")
        compose.onNodeWithText("월간").performClick()
        compose.onNodeWithContentDescription("다음 기간").performClick()
        compose.onNodeWithText("오늘").performClick()
        screenshot("03-calendar")
        compose.onNodeWithContentDescription("일정 등록").performClick()
        fill("일정 이름", "앱 실행 테스트")
        click("일정 저장")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("앱 실행 테스트"))
        compose.onNodeWithText("앱 실행 테스트").assertIsDisplayed()
        compose.onNodeWithContentDescription("앱 실행 테스트 일정 삭제").performClick()
        compose.onNodeWithText("삭제").performClick()
        compose.onNodeWithText("앱 실행 테스트").assertDoesNotExist()

        tab("AI")
        fill("어떤 프로젝트를 만들고 있나요?", "대학생을 위한 협업 앱을 개발합니다. 로그인, 시간표와 업무 보드를 구현합니다.")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("AI로 업무 나누기"))
        click("AI로 업무 나누기")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("결과 확인 & 선택"))
        screenshot("04-ai-results")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText("선택한 3개 업무를 팀 보드에 등록"))
        compose.onNodeWithText("선택한 3개 업무를 팀 보드에 등록").performClick()
        waitFor("3개 업무가 팀 보드에 공유되었습니다.")

        tab("마이페이지")
        compose.onNodeWithText("프로필 이름 수정").performClick()
        fill("이름", "앱 검증 완료")
        click("저장")
        waitFor("앱 검증 완료")
        screenshot("05-profile")
        compose.onNodeWithContentDescription("알림").performClick()
        compose.onNodeWithText("팀원이 화면 흐름 설계 업무를 완료했어요.").performClick()
        compose.onNodeWithText("읽음", substring = true).assertExists()
        back()
        click("데모 종료")
        compose.onNodeWithText("확인").performClick()
        waitFor("함께하는 프로젝트,\n더 가볍게.")
    }

    @Test fun liveBackendSignupLoginAndTaskPersistence() {
        val baseUrl = InstrumentationRegistry.getArguments().getString("qaBaseUrl")
        org.junit.Assume.assumeTrue("Pass qaBaseUrl to run against the isolated QA backend", baseUrl != null)
        click("서버 연결 설정")
        fill("API 주소 (/api/ 포함)", baseUrl!!)
        click("주소 저장")
        click("처음이신가요? 회원가입")
        val email = "android-qa-${System.currentTimeMillis()}@example.com"
        fill("이름", "실제 API 검증")
        fill("이메일", email)
        fill("비밀번호", "CampusQa123!")
        click("회원가입")
        waitFor("가입이 완료되었습니다. 로그인해 주세요.")
        click("이미 계정이 있어요 · 로그인")
        click("로그인")
        waitFor("실제 API 검증님, 반가워요 👋")
        tab("워크스페이스")
        compose.onNodeWithText("업무 추가").performClick()
        fill("업무 제목", "실제 서버 저장 검증")
        click("업무 등록")
        waitFor("실제 서버 저장 검증")
        openTask("실제 서버 저장 검증")
        click("진행 중")
        waitFor("✓  진행 중")
        back()
        compose.onNodeWithContentDescription("새로고침").performClick()
        waitFor("실제 서버 저장 검증")
        screenshot("06-live-backend")
        tab("마이페이지")
        click("로그아웃")
        compose.onNodeWithText("확인").performClick()
        fill("이메일", email)
        fill("비밀번호", "CampusQa123!")
        click("로그인")
        waitFor("실제 API 검증님, 반가워요 👋")
        tab("워크스페이스")
        waitFor("실제 서버 저장 검증")
        compose.onNodeWithText("진행 중 1").assertExists()
        scenario.close()
        scenario = ActivityScenario.launch(MainActivity::class.java)
        waitFor("실제 API 검증님, 반가워요 👋")
        tab("워크스페이스")
        waitFor("실제 서버 저장 검증")
    }
}
