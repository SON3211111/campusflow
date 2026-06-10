package com.campusflow.repository;

import com.campusflow.entity.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskDependencyRepository extends JpaRepository<TaskDependency, Long> {
    List<TaskDependency> findAllByWorkspace_WorkspaceId(String workspaceId);

    List<TaskDependency> findAllByPredecessor_TaskId(String taskId);

    List<TaskDependency> findAllBySuccessor_TaskId(String taskId);

    Optional<TaskDependency> findByPredecessor_TaskIdAndSuccessor_TaskId(String predecessorTaskId, String successorTaskId);

    void deleteByPredecessor_TaskIdAndSuccessor_TaskId(String predecessorTaskId, String successorTaskId);

    @Modifying
    @Query("DELETE FROM TaskDependency d WHERE d.predecessor.taskId = :taskId OR d.successor.taskId = :taskId")
    void deleteAllByTaskId(@Param("taskId") String taskId);

    @Modifying
    @Query("DELETE FROM TaskDependency d WHERE d.workspace.workspaceId = :workspaceId")
    void deleteAllByWorkspaceId(@Param("workspaceId") String workspaceId);
}
