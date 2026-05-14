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

    // 칸반 보드용: 삭제되지 않은 태스크만 조회 (소프트 삭제 적용)
    List<Task> findAllByWorkspace_WorkspaceIdAndIsDeletedFalse(String workspaceId);

    // 휴지통용: 소프트 삭제된 태스크만 조회
    List<Task> findAllByWorkspace_WorkspaceIdAndIsDeletedTrue(String workspaceId);
}