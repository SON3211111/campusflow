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

/**
 * 워크스페이스 태스크 관리 API 컨트롤러
 * 태스크 생성/조회/상태변경/마감일변경/소프트삭제/복원/휴지통 조회 지원
 * 삭제는 물리 삭제가 아닌 deleted=true 소프트 삭제 방식
 */
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    // 삭제되지 않은 전체 태스크 조회
    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getAllTasks(workspaceId));
    }

    // 휴지통: deleted=true인 태스크 목록 조회
    @GetMapping("/trash")
    public ResponseEntity<List<TaskResponse>> getDeletedTasks(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getDeletedTasks(workspaceId));
    }

    // 새 태스크 생성 (제목, 설명, 상태, 마감일 지정 가능)
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable String workspaceId,
            @RequestBody TaskCreateRequest request) {
        return ResponseEntity.ok(taskService.createTask(workspaceId, request));
    }

    // 소프트 삭제: deleted=true, deletedAt=현재시각 설정
    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable String taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.ok().build();
    }

    // 휴지통에서 복원: deleted=false, deletedAt=null 로 되돌림
    @PatchMapping("/{taskId}/restore")
    public ResponseEntity<TaskResponse> restoreTask(@PathVariable String taskId) {
        return ResponseEntity.ok(taskService.restoreTask(taskId));
    }

    // 칸반 보드용: 상태별로 그룹화된 태스크 맵 반환
    @GetMapping("/kanban")
    public ResponseEntity<Map<TaskStatus, List<Task>>> getKanbanBoard(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getKanbanBoard(workspaceId));
    }

    // 드래그앤드롭 상태 변경 (TODO/DOING/ISSUE/REVIEW/DONE)
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String taskId,
            @RequestParam TaskStatus status) {
        taskService.updateTaskStatus(taskId, status);
        return ResponseEntity.ok().build();
    }

    // 마감일 수정 (null 전달 시 마감일 제거)
    @PatchMapping("/{taskId}/due-date")
    public ResponseEntity<Void> updateDueDate(
            @PathVariable String taskId,
            @RequestParam(required = false) String dueDate) {
        taskService.updateTaskDueDate(taskId, dueDate);
        return ResponseEntity.ok().build();
    }
}
