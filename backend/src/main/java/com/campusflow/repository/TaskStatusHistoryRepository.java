package com.campusflow.repository;

import com.campusflow.entity.TaskStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskStatusHistoryRepository extends JpaRepository<TaskStatusHistory, Long> {

    List<TaskStatusHistory> findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(String workspaceId);

    List<TaskStatusHistory> findAllByTask_TaskIdOrderByOccurredAtDesc(String taskId);
}
