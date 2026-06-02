package com.campusflow.controller;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks") // 경로를 조금 더 범용적으로 조정했습니다.
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * 1. 기존 워크스페이스 기반 칸반 보드 조회
     */
    @GetMapping("/workspaces/{workspaceId}/kanban")
    public ResponseEntity<Map<TaskStatus, List<Task>>> getKanbanBoard(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getKanbanBoard(workspaceId));
    }

    /**
     * 2. 태스크 상태 업데이트 (대시보드 실시간 반영용)
     */
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String taskId,
            @RequestParam TaskStatus status,
            @RequestParam(required = false) String userId) {
        taskService.updateTaskStatus(taskId, status, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * 3. [추가] 프로젝트 대시보드 진행률 및 시각화 데이터 조회
     * GET /api/tasks/projects/{projectId}/progress
     */
    @GetMapping("/projects/{projectId}/progress")
    public ResponseEntity<ProjectProgressDto> getProjectProgress(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.getProjectProgress(projectId));
    }

    /**
     * 4. [추가] AI 장바구니에 담긴 태스크들을 실제 프로젝트에 할당
     * POST /api/tasks/projects/{projectId}/ai
     */
    @PostMapping("/projects/{projectId}/ai")
    public ResponseEntity<Void> addAiTasks(
            @PathVariable Long projectId,
            @RequestParam String userId,
            @RequestBody List<Task> aiProposedTasks) {
        taskService.addAiTasksToProject(projectId, userId, aiProposedTasks);
        return ResponseEntity.ok().build();
    }
}