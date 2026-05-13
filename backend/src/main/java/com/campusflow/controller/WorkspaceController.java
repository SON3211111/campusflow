package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.WorkspaceRequest;
import com.campusflow.dto.WorkspaceResponse;
import com.campusflow.entity.Workspace;
import com.campusflow.service.WorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Workspace", description = "워크스페이스 관리 API")
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @Operation(summary = "내 워크스페이스 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<WorkspaceResponse>>> getMyWorkspaces(@RequestParam String userId) {
        // DB 설계에 맞춰 userId는 String입니다.
        List<Workspace> workspaces = workspaceService.findAllByUserId(userId);

        List<WorkspaceResponse> response = workspaces.stream()
                .map(WorkspaceResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", response));
    }

    @Operation(summary = "새 워크스페이스 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> createWorkspace(
            @RequestParam String userId,
            @RequestBody WorkspaceRequest request) {

        // request.getType()은 Enum(WorkspaceType)으로 전달된다고 가정합니다.
        Workspace newWorkspace = workspaceService.createWorkspace(userId, request.getName(), request.getType());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(201, "워크스페이스 생성 성공", WorkspaceResponse.from(newWorkspace)));
    }

    @Operation(summary = "워크스페이스 수정")
    @PatchMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> updateWorkspace(
            @PathVariable String workspaceId,
            @RequestBody WorkspaceRequest request) {

        Workspace updated = workspaceService.updateWorkspace(workspaceId, request.getName(), request.getGradient());

        return ResponseEntity.ok(ApiResponse.success(200, "수정 성공", WorkspaceResponse.from(updated)));
    }

    @Operation(summary = "워크스페이스 삭제")
    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkspace(@PathVariable String workspaceId) {
        workspaceService.deleteWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 성공", null));
    }
}