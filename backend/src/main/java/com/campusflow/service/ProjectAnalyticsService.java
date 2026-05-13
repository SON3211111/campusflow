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

@Service
@RequiredArgsConstructor
public class ProjectAnalyticsService {

    private final ContributionMetricsRepository contributionRepository;

    @Transactional(readOnly = true)
    public ProjectProgressDto getOverallProgress(Long projectId) {
        return new ProjectProgressDto(String.valueOf(projectId), "Project " + projectId, 0.0, 0L, 0L, Map.of());
    }

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
