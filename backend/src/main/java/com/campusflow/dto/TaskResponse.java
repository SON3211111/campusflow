package com.campusflow.dto;

import com.campusflow.entity.Task;

/**
 * 태스크 응답 DTO
 * Task 엔티티를 프론트엔드에 전달하기 위한 형태로 변환
 */
public record TaskResponse(
        String taskId,
        String title,
        String description,
        String status,
        String startDate,
        String dueDate,
        boolean deleted,
        String deletedAt,
        String assigneeId,
        String assigneeName,
        String priority,
        Integer estimatedHours,
        String quickSignal,
        String boardColumn
) {
    public static TaskResponse from(Task task) {
        String boardColumn = task.getBoardColumn();
        String status = statusFromBoardColumn(boardColumn);
        if (status == null) {
            status = task.getStatus().name();
        }
        return new TaskResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                status,
                task.getStartDate() != null ? task.getStartDate().toString() : null,
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                task.isDeleted(),
                task.getDeletedAt() != null ? task.getDeletedAt().toString() : null,
                task.getAssignee() != null ? task.getAssignee().getUserId() : null,
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getEstimatedHours(),
                task.getQuickSignal(),
                boardColumn
        );
    }

    private static String statusFromBoardColumn(String boardColumn) {
        if (boardColumn == null) return null;
        return switch (boardColumn) {
            case "상태 없음" -> "TODO";
            case "시작하지 않음" -> "REVIEW";
            case "진행 중" -> "DOING";
            case "보류 중" -> "ISSUE";
            case "완료" -> "DONE";
            default -> null;
        };
    }
}
