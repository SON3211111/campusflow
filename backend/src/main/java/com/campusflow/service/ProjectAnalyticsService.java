package com.campusflow.service;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TeamContributionDto;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
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

    private final TaskRepository taskRepository;
    private final ContributionMetricsRepository contributionRepository;

    /**
     * 프로젝트 진행 상황 요약 (Donut Chart용)
     * 파라미터 타입을 Long으로 변경하여 Entity Id와 일치시킴
     */
    @Transactional(readOnly = true)
    public ProjectProgressDto getOverallProgress(Long projectId) {
        // [수정] projectId의 타입을 Long으로 처리하여 Repository 쿼리와 맞춤
        List<Task> tasks = taskRepository.findAllByProject_ProjectId(projectId);

        if (tasks.isEmpty()) {
            return new ProjectProgressDto(String.valueOf(projectId), "No Project Found", 0.0, 0L, 0L, Map.of());
        }

        // 상태별 카운트 집계 (Lombok @Getter가 정상 작동해야 t.getStatus() 사용 가능)
        Map<String, Long> distribution = tasks.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        long total = tasks.size();
        // TaskStatus.DONE이 Enum에 정의되어 있어야 함
        long completed = distribution.getOrDefault(TaskStatus.DONE.name(), 0L);

        // 진행률 계산 (소수점 둘째자리까지)
        double rate = (total > 0) ? (double) completed / total * 100 : 0;
        double roundedRate = Math.round(rate * 100) / 100.0;

        return new ProjectProgressDto(
                String.valueOf(projectId),
                tasks.get(0).getProject().getTitle(), // Project 엔티티의 getTitle() 참조
                roundedRate,
                total,
                completed,
                distribution
        );
    }

    /**
     * 팀원별 기여도 분석 (Bar Chart용)
     * 파라미터 타입을 Long으로 변경
     */
    @Transactional(readOnly = true)
    public TeamContributionDto getTeamContributions(Long projectId) {
        // DBML의 contribution_metrics 테이블 조회
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