package com.campusflow.controller;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TeamContributionDto;
import com.campusflow.service.ProjectAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 프로젝트 분석 API 컨트롤러
 * - /progress      : 전체 태스크 진행률 및 상태 분포 조회
 * - /contributions : 팀원별 태스크 완료/이슈 해결 기여도 조회
 */
@RestController
@RequestMapping("/api/projects/{projectId}/analytics")
@RequiredArgsConstructor
public class ProjectAnalyticsController {

    private final ProjectAnalyticsService analyticsService;

    // 프로젝트 전체 진행률 조회 (완료율, 상태별 태스크 수)
    @GetMapping("/progress")
    public ResponseEntity<ProjectProgressDto> getProgress(@PathVariable Long projectId) {
        return ResponseEntity.ok(analyticsService.getOverallProgress(projectId));
    }

    // 팀원별 기여도 조회 (완료 태스크 수, 이슈 해결 수)
    @GetMapping("/contributions")
    public ResponseEntity<TeamContributionDto> getContributions(@PathVariable Long projectId) {
        return ResponseEntity.ok(analyticsService.getTeamContributions(projectId));
    }
}