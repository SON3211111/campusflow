package com.campusflow.mobile

import com.campusflow.mobile.data.*
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class ValidationTest {
    @Test fun emailRejectsInvalidAddresses() {
        assertTrue(Validation.email(" student@campus.ac.kr "))
        listOf("hello", "a@b", "a b@c.com", "@campus.com").forEach { assertFalse(Validation.email(it)) }
    }
    @Test fun aiDescriptionRejectsBlankAndRepeatedNoise() {
        listOf("", "앱 만들어", "a".repeat(100), "!".repeat(100), "설명".repeat(3000)).forEach { assertFalse(Validation.description(it)) }
        assertTrue(Validation.description("대학생을 위한 협업 앱을 개발합니다. 로그인, 시간표와 업무 보드를 구현합니다."))
    }
    @Test fun datesRejectImpossibleDays() {
        assertTrue(Validation.date("")); assertTrue(Validation.date("2028-02-29"))
        assertFalse(Validation.date("2026-02-29")); assertFalse(Validation.date("26-10-15"))
    }
    @Test fun scheduleRequiresChronologicalTimes() {
        assertTrue(Validation.times("09:00", "10:30"))
        assertFalse(Validation.times("10:00", "09:00"))
        assertFalse(Validation.times("09:00", "09:00"))
        assertFalse(Validation.times("25:00", "26:00"))
    }
    @Test fun deadlineLabelsDoNotDependOnTimezoneOrMidnight() {
        val today = LocalDate.of(2026, 9, 26)
        assertEquals("D-Day", Task("1", "Test", dueDate = "2026-09-26T00:00:00").dDay(today))
        assertEquals("D-2", Task("2", "Test", dueDate = "2026-09-28").dDay(today))
        assertEquals("1일 지남", Task("3", "Test", dueDate = "2026-09-25").dDay(today))
        assertNull(Task("4", "Test", dueDate = "invalid").dDay(today))
    }
    @Test fun releaseUrlsRequireHttpsAndNoEmbeddedCredentials() {
        assertEquals("https://example.com/api/", Validation.baseUrl("https://example.com/api", false))
        listOf("http://example.com/api", "https://user:pass@example.com/api", "file:///tmp", "https://example.com/api?x=1").forEach { assertTrue(runCatching { Validation.baseUrl(it, false) }.isFailure) }
        assertEquals("http://10.0.2.2:8080/api/", Validation.baseUrl("http://10.0.2.2:8080/api", true))
    }
}
