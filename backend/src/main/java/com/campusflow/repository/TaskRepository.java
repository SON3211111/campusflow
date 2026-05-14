package com.campusflow.repository;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {

    // 기존 워크스페이스 관련 메서드
    List<Task> findAllByWorkspace_WorkspaceIdAndParentTaskIsNull(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceId(String workspaceId);
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceIdAndStatus(String workspaceId, TaskStatus status);

    // [추가] 대시보드 시각화 및 진행률 계산을 위한 프로젝트 ID 조회 메서드
    List<Task> findAllByProject_ProjectId(Long projectId);
}