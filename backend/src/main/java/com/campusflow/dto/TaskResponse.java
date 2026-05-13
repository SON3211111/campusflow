package com.campusflow.dto;

import com.campusflow.entity.Task;

public record TaskResponse(
        String taskId,
        String title,
        String description,
        String status,
        String dueDate,
        boolean deleted,
        String deletedAt
) {
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus().name(),
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                task.isDeleted(),
                task.getDeletedAt() != null ? task.getDeletedAt().toString() : null
        );
    }
}
