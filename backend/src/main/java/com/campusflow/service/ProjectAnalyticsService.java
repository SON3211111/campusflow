package com.campusflow.service;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TeamContributionDto;
import com.campusflow.repository.ContributionMetricsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 프로젝트 분석 서비스
 * 진행률과 팀원별 기여도 데이터를 계산하여 대시보드에 제공
 */
@Service
@RequiredArgsConstructor
public class ProjectAnalyticsService {

    private final ContributionMetricsRepository contributionRepository;

    /** 전체 진행률 조회 (현재는 기본값 반환, 추후 실제 계산 로직 연결 예정) */
    @Transactional(readOnly = true)
    public ProjectProgressDto getOverallProgress(Long projectId) {
        return new ProjectProgressDto(String.valueOf(projectId), "Project " + projectId, 0.0, 0L, 0L, Map.of());
    }

    /** 팀원별 기여도 조회: ContributionMetrics 테이블에서 집계 */
    @Transactional(readOnly = true)
    public TeamContributionDto getTeamContributions(Long projectId) {
        var metrics = contributionRepository.findAllByProject_ProjectId(projectId);

        List<TeamContributionDto.MemberMetric> memberMetrics = metrics.stream()
                .map(m -> new TeamContributionDto.MemberMetric(
                        m.getUser().getUserId(),
                        m.getUser().getName(),
                        m.getTaskCompletionCount(),
                        m.getIssueSolvingCount()
                ))
                .collect(Collectors.toList());

        return new TeamContributionDto(memberMetrics);
    }
}
