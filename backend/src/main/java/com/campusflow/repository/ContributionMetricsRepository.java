package com.campusflow.repository;

import com.campusflow.entity.ContributionMetrics; // 이 엔티티도 있어야 함
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContributionMetricsRepository extends JpaRepository<ContributionMetrics, Long> {
    // 서비스에서 사용하는 메서드 추가
    List<ContributionMetrics> findAllByProject_ProjectId(Long projectId);
}