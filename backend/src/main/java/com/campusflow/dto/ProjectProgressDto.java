package com.campusflow.dto;

import java.util.Map;

/**
 * 프로젝트의 전체 진행률 및 상태 분포 데이터
 */
public record ProjectProgressDto(
        String projectId,
        String projectTitle,
        double progressRate,      // 전체 진행률 (%)
        long totalTasks,          // 전체 태스크 수
        long completedTasks,      // 완료된 태스크 수
        Map<String, Long> statusDistribution // { "TODO": 5, "DONE": 10 ... }
) {}