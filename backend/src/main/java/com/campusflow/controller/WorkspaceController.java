package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.entity.Workspace;
import com.campusflow.service.WorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Workspace", description = "워크스페이스 관리 API")
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @Operation(summary = "내 워크스페이스 목록 조회", description = "현재 로그인한 유저가 속한 모든 워크스페이스를 가져옵니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Workspace>>> getMyWorkspaces(@RequestParam String userId) {
        List<Workspace> workspaces = workspaceService.findAllByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", workspaces));
    }

    @Operation(summary = "새 워크스페이스 생성", description = "팀 또는 개인 워크스페이스를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Workspace>> createWorkspace(
            @RequestParam String userId,
            @RequestBody WorkspaceRequest request) {

        Workspace newWorkspace = workspaceService.createWorkspace(userId, request.getName(), request.getType());
        return ResponseEntity.ok(ApiResponse.success(201, "워크스페이스 생성 성공", newWorkspace));
    }

    @Operation(summary = "워크스페이스 이름 수정")
    @PatchMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<Workspace>> renameWorkspace(
            @PathVariable String workspaceId,
            @RequestBody WorkspaceRequest request) {
        Workspace updated = workspaceService.renameWorkspace(workspaceId, request.getName());
        return ResponseEntity.ok(ApiResponse.success(200, "수정 성공", updated));
    }

    @Operation(summary = "워크스페이스 삭제")
    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkspace(@PathVariable String workspaceId) {
        workspaceService.deleteWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 성공", null));
    }

    @Getter @Setter
    @NoArgsConstructor
    public static class WorkspaceRequest {
        private String name;
        private String type; // "TEAM" 또는 "PERSONAL"
    }
}