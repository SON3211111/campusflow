package com.campusflow.dto;

import com.campusflow.entity.ScheduleBlock;

/** 시간표 블록 응답 */
public record ScheduleBlockResponse(
        String blockId,
        String category,
        String title,
        String dayOfWeek,
        String startTime,
        String endTime
) {
    public static ScheduleBlockResponse from(ScheduleBlock b) {
        return new ScheduleBlockResponse(
                b.getBlockId(),
                b.getCategory().name(),
                b.getTitle() != null ? b.getTitle() : "",
                b.getDayOfWeek(),
                b.getStartTime().toString(),
                b.getEndTime().toString()
        );
    }
}
