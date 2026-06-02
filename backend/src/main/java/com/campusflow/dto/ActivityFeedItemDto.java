package com.campusflow.dto;

import com.campusflow.entity.TaskStatusHistory;

import java.time.LocalDateTime;

public record ActivityFeedItemDto(
        String taskId,
        String taskTitle,
        String changedByUserId,
        String changedByName,
        String prevStatus,
        String currStatus,
        LocalDateTime occurredAt
) {
    public static ActivityFeedItemDto from(TaskStatusHistory h) {
        return new ActivityFeedItemDto(
                h.getTask().getTaskId(),
                h.getTask().getTitle(),
                h.getChangedBy() != null ? h.getChangedBy().getUserId() : null,
                h.getChangedBy() != null ? h.getChangedBy().getName() : "알 수 없음",
                h.getPrevStatus() != null ? h.getPrevStatus().name() : null,
                h.getCurrStatus().name(),
                h.getOccurredAt()
        );
    }
}
