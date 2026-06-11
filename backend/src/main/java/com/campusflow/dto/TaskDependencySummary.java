package com.campusflow.dto;

import java.util.List;

public record TaskDependencySummary(
        List<TaskDependencyResponse> predecessors,
        List<TaskDependencyResponse> successors
) {}
