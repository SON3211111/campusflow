package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.dto.TaskResponse;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 워크스페이스 하위 태스크 CRUD 컨트롤러
 * 기본 경로: /api/workspaces/{workspaceId}/tasks
 * 모든 응답은 ApiResponse<T> 래퍼 형식으로 통일
 */
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks")
@RequiredArgsConstructor
public class WorkspaceTaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(@PathVariable String workspaceId) {
        List<TaskResponse> tasks = taskService.getActiveTaskResponses(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", tasks));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @PathVariable String workspaceId,
            @RequestBody TaskCreateRequest req) {
        TaskResponse saved = taskService.createTask(workspaceId, req);
        return ResponseEntity.ok(ApiResponse.success(200, "생성 성공", saved));
    }

    @GetMapping("/trash")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTrash(@PathVariable String workspaceId) {
        List<TaskResponse> deleted = taskService.getDeletedTaskResponses(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", deleted));
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable String taskId,
            @RequestParam TaskStatus status) {
        taskService.updateTaskStatus(taskId, status);
        return ResponseEntity.ok(ApiResponse.success(200, "상태 변경 완료"));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> softDelete(@PathVariable String taskId) {
        taskService.softDeleteTask(taskId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 완료"));
    }

    @PatchMapping("/{taskId}/restore")
    public ResponseEntity<ApiResponse<TaskResponse>> restore(@PathVariable String taskId) {
        TaskResponse restored = taskService.restoreTask(taskId);
        return ResponseEntity.ok(ApiResponse.success(200, "복원 완료", restored));
    }

    @PatchMapping("/{taskId}/due-date")
    public ResponseEntity<ApiResponse<Void>> updateDueDate(
            @PathVariable String taskId,
            @RequestParam String dueDate) {
        taskService.updateDueDate(taskId, dueDate);
        return ResponseEntity.ok(ApiResponse.success(200, "마감일 수정 완료"));
    }

    @PatchMapping("/{taskId}/description")
    public ResponseEntity<ApiResponse<Void>> updateDescription(
            @PathVariable String taskId,
            @RequestBody Map<String, String> body) {
        taskService.updateDescription(taskId, body.getOrDefault("description", ""));
        return ResponseEntity.ok(ApiResponse.success(200, "설명 수정 완료"));
    }
}
