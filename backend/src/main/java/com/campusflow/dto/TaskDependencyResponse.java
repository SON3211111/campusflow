package com.campusflow.dto;

import com.campusflow.entity.TaskDependency;

public record TaskDependencyResponse(
        Long id,
        String predecessorTaskId,
        String predecessorTitle,
        String successorTaskId,
        String successorTitle
) {
    public static TaskDependencyResponse from(TaskDependency dependency) {
        return new TaskDependencyResponse(
                dependency.getId(),
                dependency.getPredecessor().getTaskId(),
                dependency.getPredecessor().getTitle(),
                dependency.getSuccessor().getTaskId(),
                dependency.getSuccessor().getTitle()
        );
    }
}
