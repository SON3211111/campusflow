package com.campusflow.dto;

import java.util.List;

/**
 * 병목 영향 리포트 응답 DTO
 * 각 병목 태스크가 얼마나 막혔고, 몇 개의 후속 업무에 영향을 주는지,
 * 최종적으로 프로젝트 마감이 몇 일 연기될 수 있는지를 담는다.
 */
public record BottleneckReportDto(
        List<BottleneckItem> bottlenecks,
        int totalDelayDays,          // 전체 병목 중 가장 큰 지연일
        String projectDeadline,      // 현재 전체 태스크 중 가장 늦은 dueDate
        String estimatedNewDeadline  // projectDeadline + totalDelayDays
) {

    public record BottleneckItem(
            String taskId,
            String title,
            String status,           // DOING | ISSUE
            int daysStuck,           // 현재 상태로 몇 일째 정체 중
            int delayDays,           // 임계값(3일) 초과 일수 = 실질 지연일
            String assigneeName,
            String dueDate,
            int affectedTaskCount,
            List<AffectedTask> affectedTasks
    ) {}

    public record AffectedTask(
            String taskId,
            String title,
            String dueDate,
            String status,
            String assigneeName,
            int estimatedDelayDays
    ) {}
}
