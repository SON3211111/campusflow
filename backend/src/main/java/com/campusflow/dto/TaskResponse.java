package com.campusflow.dto;

import com.campusflow.entity.Task;

/**
 * 태스크 응답 DTO
 * Task 엔티티를 프론트엔드에 전달하기 위한 형태로 변환
 * LocalDate/LocalDateTime → String 직렬화 포함
 */
public record TaskResponse(
        String taskId,
        String title,
        String description,
        String status,
        String dueDate,
        boolean deleted,
        String deletedAt,
        String assigneeId,
        String assigneeName,
        String priority,
        String quickSignal
) {
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus().name(),
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                task.isDeleted(),
                task.getDeletedAt() != null ? task.getDeletedAt().toString() : null,
                task.getAssignee() != null ? task.getAssignee().getUserId() : null,
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getQuickSignal()
        );
    }
}
