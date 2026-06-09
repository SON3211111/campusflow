package com.campusflow.repository;

import com.campusflow.entity.TaskStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskStatusHistoryRepository extends JpaRepository<TaskStatusHistory, Long> {

    List<TaskStatusHistory> findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(String workspaceId);

    List<TaskStatusHistory> findAllByTask_TaskIdOrderByOccurredAtDesc(String taskId);

    org.springframework.data.domain.Page<TaskStatusHistory> findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(
            String workspaceId, org.springframework.data.domain.Pageable pageable);

    // 워크스페이스 삭제 시 전체 제거
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
}
