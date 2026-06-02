package com.campusflow.repository;

import com.campusflow.entity.ContributionMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ContributionMetricsRepository extends JpaRepository<ContributionMetrics, Long> {
    List<ContributionMetrics> findAllByProject_ProjectId(Long projectId);

    java.util.Optional<ContributionMetrics> findByProject_ProjectIdAndUser_UserId(Long projectId, String userId);

    @Modifying
    @Query("DELETE FROM ContributionMetrics c WHERE c.project IN (SELECT p FROM Project p WHERE p.workspace.workspaceId = :workspaceId)")
    void deleteAllByProject_Workspace_WorkspaceId(@Param("workspaceId") String workspaceId);
}