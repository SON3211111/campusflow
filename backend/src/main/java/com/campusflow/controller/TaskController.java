package com.campusflow.controller;

import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.dto.TaskResponse;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getAllTasks(workspaceId));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable String workspaceId,
            @RequestBody TaskCreateRequest request) {
        return ResponseEntity.ok(taskService.createTask(workspaceId, request));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable String taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/kanban")
    public ResponseEntity<Map<TaskStatus, List<Task>>> getKanbanBoard(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getKanbanBoard(workspaceId));
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String taskId,
            @RequestParam TaskStatus status) {
        taskService.updateTaskStatus(taskId, status);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{taskId}/due-date")
    public ResponseEntity<Void> updateDueDate(
            @PathVariable String taskId,
            @RequestParam(required = false) String dueDate) {
        taskService.updateTaskDueDate(taskId, dueDate);
        return ResponseEntity.ok().build();
    }
}
