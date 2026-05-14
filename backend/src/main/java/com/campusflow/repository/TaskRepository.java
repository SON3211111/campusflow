package com.campusflow.repository;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findAllByWorkspace_WorkspaceIdAndParentTaskIsNull(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceId(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceIdAndDeletedFalse(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceIdAndDeletedTrue(String workspaceId);
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
    List<Task> findAllByWorkspace_WorkspaceIdAndStatus(String workspaceId, TaskStatus status);
}
