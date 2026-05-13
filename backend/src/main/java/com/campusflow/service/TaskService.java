package com.campusflow.service;

import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.dto.TaskResponse;
import com.campusflow.entity.Task;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceId(workspaceId)
                .stream().map(TaskResponse::from).toList();
    }

    @Transactional
    public TaskResponse createTask(String workspaceId, TaskCreateRequest req) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));
        TaskStatus status = TaskStatus.TODO;
        if (req.status() != null && !req.status().isBlank()) {
            try { status = TaskStatus.valueOf(req.status()); } catch (IllegalArgumentException ignored) {}
        }
        Task task = Task.builder()
                .title(req.title())
                .description(req.description() != null ? req.description() : "")
                .status(status)
                .workspace(workspace)
                .build();
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(String taskId) {
        taskRepository.deleteById(taskId);
    }

    @Transactional(readOnly = true)
    public Map<TaskStatus, List<Task>> getKanbanBoard(String workspaceId) {
        List<Task> tasks = taskRepository.findAllByWorkspace_WorkspaceId(workspaceId);
        return tasks.stream().collect(Collectors.groupingBy(Task::getStatus));
    }

    @Transactional
    public void updateTaskStatus(String taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setStatus(newStatus);
    }
}
