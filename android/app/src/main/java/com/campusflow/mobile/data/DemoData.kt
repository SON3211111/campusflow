package com.campusflow.mobile.data

import java.time.LocalDate

/** Explicitly selected local demo. Never used as a fallback for a failed server call. */
class DemoData {
    val session = Session("demo", "demo-user", "캠퍼스")
    val workspaces = mutableListOf(Workspace("demo-ws", "캡스톤 디자인 · CampusFlow", "TEAM", session.userId))
    val members = listOf(Member(session.userId, "캠퍼스", "campus@example.com", "OWNER"), Member("demo-team", "팀원", "team@example.com", "MEMBER"))
    val tasks = mutableMapOf("demo-ws" to mutableListOf(
        Task("demo-1", "모바일 홈 화면 구현", "오늘의 일정과 내 업무를 한눈에 확인하는 홈 화면을 구현합니다.", "DOING", LocalDate.now().plusDays(2).toString(), session.userId, session.name, "HIGH"),
        Task("demo-2", "API 연동 시나리오 점검", "웹과 모바일에서 업무 상태가 동일하게 반영되는지 확인합니다.", "REVIEW", LocalDate.now().plusDays(4).toString(), session.userId, session.name, "MEDIUM"),
        Task("demo-3", "화면 흐름 설계", "5개 하단 탭과 입력 바텀 시트의 이동 흐름을 정리합니다.", "DONE", LocalDate.now().toString(), "demo-team", "팀원", "HIGH"),
    ))
    val schedules = mutableListOf(Schedule("demo-schedule", "캡스톤 디자인", "CLASS", Validation.days[LocalDate.now().dayOfWeek.value - 1], "14:00", "16:00"))
    val notices = mutableListOf(Notice("demo-notice", "팀원이 화면 흐름 설계 업무를 완료했어요.", false, LocalDate.now().atTime(9, 0).toString()))
    var profile = Profile(session.userId, session.name, "campus@example.com")
}
