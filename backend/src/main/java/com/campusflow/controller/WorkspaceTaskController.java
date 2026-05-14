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

/**
 * 워크스페이스 하위 태스크 CRUD 컨트롤러
 * 기본 경로: /api/workspaces/{workspaceId}/tasks
 *
 * 프론트엔드(WorkSpacePage, AiTaskPage)가 호출하는 URL과 1:1 매핑됨.
 * 소프트 삭제 방식 사용: DELETE는 DB에서 제거하지 않고 isDeleted=true 처리.
 */
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks")
@RequiredArgsConstructor
public class WorkspaceTaskController {

    private final TaskService taskService;

    /**
     * 칸반 보드 태스크 목록 조회
     * GET /api/workspaces/{workspaceId}/tasks
     * 소프트 삭제된 태스크는 제외하고 반환
     */
    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(@PathVariable String workspaceId) {
        List<TaskResponse> tasks = taskService.getActiveTasks(workspaceId)
                .stream()
                .map(TaskResponse::from)
                .toList();
        return ResponseEntity.ok(tasks);
    }

    /**
     * 태스크 생성
     * POST /api/workspaces/{workspaceId}/tasks
     * body: { title, description, status }
     * 생성된 태스크를 응답으로 반환해야 프론트에서 실제 taskId를 사용할 수 있음
     */
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable String workspaceId,
            @RequestBody TaskCreateRequest req) {
        Task saved = taskService.createTask(workspaceId, req);
        return ResponseEntity.ok(TaskResponse.from(saved));
    }

    /**
     * 휴지통 조회
     * GET /api/workspaces/{workspaceId}/tasks/trash
     * 소프트 삭제된 태스크만 반환
     */
    @GetMapping("/trash")
    public ResponseEntity<List<TaskResponse>> getTrash(@PathVariable String workspaceId) {
        List<TaskResponse> deleted = taskService.getDeletedTasks(workspaceId)
                .stream()
                .map(TaskResponse::from)
                .toList();
        return ResponseEntity.ok(deleted);
    }

    /**
     * 태스크 상태 변경 (칸반 드래그앤드롭)
     * PATCH /api/workspaces/{workspaceId}/tasks/{taskId}/status?status=DOING
     */
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String taskId,
            @RequestParam TaskStatus status) {
        taskService.updateTaskStatus(taskId, status);
        return ResponseEntity.ok().build();
    }

    /**
     * 태스크 소프트 삭제 (휴지통으로 이동)
     * DELETE /api/workspaces/{workspaceId}/tasks/{taskId}
     * DB에서 실제로 삭제하지 않고 isDeleted=true, deletedAt=now()로 마킹
     */
    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> softDelete(@PathVariable String taskId) {
        taskService.softDeleteTask(taskId);
        return ResponseEntity.ok().build();
    }

    /**
     * 태스크 복원 (휴지통 → 칸반 보드)
     * PATCH /api/workspaces/{workspaceId}/tasks/{taskId}/restore
     * 복원된 태스크를 응답으로 반환 → 프론트에서 status 기반 컬럼 배치에 사용
     */
    @PatchMapping("/{taskId}/restore")
    public ResponseEntity<TaskResponse> restore(@PathVariable String taskId) {
        Task restored = taskService.restoreTask(taskId);
        return ResponseEntity.ok(TaskResponse.from(restored));
    }

    /**
     * 마감일 수정
     * PATCH /api/workspaces/{workspaceId}/tasks/{taskId}/due-date?dueDate=2025-06-01
     */
    @PatchMapping("/{taskId}/due-date")
    public ResponseEntity<Void> updateDueDate(
            @PathVariable String taskId,
            @RequestParam String dueDate) {
        taskService.updateDueDate(taskId, dueDate);
        return ResponseEntity.ok().build();
    }
}
