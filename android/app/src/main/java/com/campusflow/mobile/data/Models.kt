package com.campusflow.mobile.data

import java.time.LocalDate
import java.time.LocalTime
import java.time.temporal.ChronoUnit

data class Envelope<T>(val status: Int, val message: String?, val data: T?) {
    fun value(): T {
        check(status in 200..299) { message ?: "요청을 처리하지 못했습니다." }
        return checkNotNull(data) { "서버 응답에 데이터가 없습니다." }
    }
}
data class Session(val accessToken: String, val userId: String, val name: String)
data class Workspace(val workspaceId: String, val name: String, val type: String, val ownerId: String?)
data class Member(val userId: String, val name: String, val email: String?, val role: String)
data class Profile(val userId: String, val name: String, val email: String)
enum class TaskStatus(val label: String) {
    TODO("상태 없음"), REVIEW("시작 전"), DOING("진행 중"), ISSUE("보류"), DONE("완료")
}
data class Task(
    val taskId: String, val title: String, val description: String? = null,
    val status: String = "TODO", val dueDate: String? = null,
    val assigneeId: String? = null, val assigneeName: String? = null,
    val priority: String? = null, val estimatedHours: Int? = null,
) {
    val deadline: LocalDate? get() = runCatching { LocalDate.parse(dueDate?.take(10)) }.getOrNull()
    fun dDay(today: LocalDate = LocalDate.now()): String? = deadline?.let {
        val days = ChronoUnit.DAYS.between(today, it)
        when { days == 0L -> "D-Day"; days > 0 -> "D-$days"; else -> "${-days}일 지남" }
    }
}
data class TaskInput(
    val title: String, val description: String = "", val status: String = "REVIEW",
    val dueDate: String? = null, val assigneeId: String? = null,
    val priority: String = "MEDIUM", val estimatedHours: Int? = null,
)
data class Schedule(
    val blockId: String, val title: String, val category: String,
    val dayOfWeek: String, val startTime: String, val endTime: String,
)
data class ScheduleInput(
    val userId: String, val title: String, val category: String,
    val dayOfWeek: String, val startTime: String, val endTime: String,
)
data class Notice(val notificationId: String, val message: String, val read: Boolean, val createdAt: String?)
data class AiTask(val title: String, val description: String?, val category: String?, val priority: String?, val estimatedHours: Int?)
data class AiResult(val tasks: List<AiTask>, val fallback: Boolean = false)
data class Draft(val id: String, val task: AiTask, val selected: Boolean = true)

object Validation {
    val days = listOf("월", "화", "수", "목", "금", "토", "일")
    fun email(value: String) = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value.trim())
    fun description(value: String): Boolean {
        val text = value.trim()
        return text.length in 20..4000 && text.count { it.isLetterOrDigit() } >= 12 &&
            text.filter { it.isLetterOrDigit() }.toSet().size >= 5
    }
    fun date(value: String) = value.isBlank() || runCatching { LocalDate.parse(value) }.isSuccess
    fun times(start: String, end: String): Boolean = runCatching {
        LocalTime.parse(start).isBefore(LocalTime.parse(end))
    }.getOrDefault(false)
    fun baseUrl(value: String, allowHttp: Boolean): String {
        val uri = java.net.URI(value.trim())
        require(uri.scheme == "https" || (allowHttp && uri.scheme == "http")) { "HTTPS 서버 주소를 입력하세요. 개발 빌드는 HTTP도 지원합니다." }
        require(!uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null) { "올바른 서버 주소를 입력하세요." }
        return value.trim().trimEnd('/') + "/"
    }
}
