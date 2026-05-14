package com.campusflow.repository;

import com.campusflow.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByInviteCode(String inviteCode);

    List<Project> findAllByWorkspace_WorkspaceId(String workspaceId);

    @Modifying
    @Query("DELETE FROM Project p WHERE p.workspace.workspaceId = :workspaceId")
    void deleteAllByWorkspace_WorkspaceId(@Param("workspaceId") String workspaceId);
}