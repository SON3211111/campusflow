package com.campusflow.controller;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TeamContributionDto;
import com.campusflow.service.ProjectAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/analytics")
@RequiredArgsConstructor
public class ProjectAnalyticsController {

    private final ProjectAnalyticsService analyticsService;

    @GetMapping("/progress")
    public ResponseEntity<ProjectProgressDto> getProgress(@PathVariable Long projectId) { // String -> Long
        return ResponseEntity.ok(analyticsService.getOverallProgress(projectId));
    }

    @GetMapping("/contributions")
    public ResponseEntity<TeamContributionDto> getContributions(@PathVariable Long projectId) { // String -> Long
        return ResponseEntity.ok(analyticsService.getTeamContributions(projectId));
    }
}