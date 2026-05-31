package com.campusflow.repository;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // 워크스페이스 삭제 시: Task의 project FK 제거 (FK 제약 위반 방지)
    @Modifying
    @Query("UPDATE Task t SET t.project = null WHERE t.workspace.workspaceId = :workspaceId")
    void updateProjectNullByWorkspace(@Param("workspaceId") String workspaceId);

    // 워크스페이스 삭제 시: Task의 parentTask FK 제거 (자기 참조 FK 제약 위반 방지)
    @Modifying
    @Query("UPDATE Task t SET t.parentTask = null WHERE t.workspace.workspaceId = :workspaceId")
    void updateParentTaskNullByWorkspace(@Param("workspaceId") String workspaceId);

    // createdAt이 null인 기존 태스크에 현재 시각 세팅
    @Modifying
    @Query("UPDATE Task t SET t.createdAt = :now WHERE t.createdAt IS NULL")
    int backfillCreatedAt(@Param("now") java.time.LocalDateTime now);
}
