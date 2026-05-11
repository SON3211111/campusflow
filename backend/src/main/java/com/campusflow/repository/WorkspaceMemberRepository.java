package com.campusflow.repository;

import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {
    List<WorkspaceMember> findAllByUser_UserId(String userId);
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
}