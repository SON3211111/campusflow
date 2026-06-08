package com.campusflow.dto;

/** 시간표 블록 추가 요청 */
public record ScheduleBlockRequest(
        String userId,
        String title,
        String category,   // CLASS | PRIVATE | TASK | FREE
        String dayOfWeek,
        String startTime,  // HH:mm[:ss]
        String endTime
) {}
