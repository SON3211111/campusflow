package com.campusflow.controller;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * 칸반보드 전체 데이터 조회
     */
    @GetMapping("/kanban")
    public ResponseEntity<Map<TaskStatus, List<Task>>> getKanbanBoard(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.getKanbanBoard(projectId));
    }

    /**
     * 태스크 상태 변경 (예: TODO -> DOING)
     */
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long taskId,
            @RequestParam TaskStatus status) {

        taskService.updateTaskStatus(taskId, status);
        return ResponseEntity.ok().build();
    }
}