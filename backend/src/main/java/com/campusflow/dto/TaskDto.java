package com.campusflow.dto;

// AI 서버 /generate-tasks 응답의 업무 카드 하나
// AI main.py의 Task 클래스와 필드가 일치해야 함
public record TaskDto(
        String title,
        String description,
        String category,        // 기획 / 디자인 / 프론트 / 백엔드 / 테스트
        String priority,        // HIGH / MEDIUM / LOW
        Integer estimatedHours  // 예상 소요 시간 (null 가능)
) {}
