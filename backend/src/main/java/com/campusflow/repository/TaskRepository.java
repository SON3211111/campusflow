package com.campusflow.repository;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {

    List<Task> findAllByWorkspace_WorkspaceId(String workspaceId);
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceIdAndStatus(String workspaceId, TaskStatus status);
    List<Task> findAllByWorkspace_WorkspaceIdAndAssignee_UserId(String workspaceId, String userId);

    // 대시보드 진행률 계산용
    List<Task> findAllByProject_ProjectId(Long projectId);

    // 칸반 보드용: 삭제되지 않은 태스크만 조회
    List<Task> findAllByWorkspace_WorkspaceIdAndDeletedFalse(String workspaceId);

    // 휴지통용: 소프트 삭제된 태스크만 조회
    List<Task> findAllByWorkspace_WorkspaceIdAndDeletedTrue(String workspaceId);
}
