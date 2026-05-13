package com.campusflow.dto;

import com.campusflow.entity.Task;

public record TaskResponse(String taskId, String title, String description, String status) {
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus().name()
        );
    }
}
