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
@CrossOrigin(origins = "http://localhost:3000")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @Operation(summary = "내 워크스페이스 목록 조회", description = "현재 로그인한 유저가 속한 모든 워크스페이스를 가져옵니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Workspace>>> getMyWorkspaces(@RequestParam String userId) {
        List<Workspace> workspaces = workspaceService.findAllByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", workspaces));
    }

    @Operation(summary = "새 워크스페이스 생성", description = "새로운 팀 워크스페이스를 생성합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Workspace>> createWorkspace(
            @RequestParam String userId,
            @RequestBody WorkspaceRequest request) { // Map 대신 전용 클래스 사용

        Workspace newWorkspace = workspaceService.createTeamWorkspace(userId, request.getName());
        return ResponseEntity.ok(ApiResponse.success(201, "워크스페이스 생성 성공", newWorkspace));
    }

    // 데이터 전송을 위한 간단한 DTO 클래스 추가
    @Getter @Setter
    @NoArgsConstructor
    public static class WorkspaceRequest {
        private String name;
    }
}