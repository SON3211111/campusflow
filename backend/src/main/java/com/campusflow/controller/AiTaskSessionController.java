package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.service.AiTaskSessionService;
import com.campusflow.websocket.TaskWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * 워크스페이스별 AI Task 세션 저장/조회/삭제
 * 경로: /api/workspaces/{workspaceId}/ai-session
 */
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/ai-session")
@RequiredArgsConstructor
public class AiTaskSessionController {

    private final AiTaskSessionService service;
    private final TaskWebSocketHandler wsHandler;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSession(
            @PathVariable String workspaceId) {
        Optional<String> data = service.getSession(workspaceId);
        if (data.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(200, "세션 없음", Map.of("exists", false)));
        }
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공",
                Map.of("exists", true, "sessionData", data.get())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Void>> saveSession(
            @PathVariable String workspaceId,
            @RequestBody Map<String, String> body) {
        String sessionData = body.get("sessionData");
        String userId = body.getOrDefault("userId", "");
        if (sessionData == null || sessionData.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "sessionData 필요"));
        }
        service.saveSession(workspaceId, sessionData, userId);
        wsHandler.broadcast(workspaceId,
                "{\"type\":\"AI_SESSION_UPDATE\",\"workspaceId\":\"" + escapeJson(workspaceId) +
                "\",\"updatedBy\":\"" + escapeJson(userId) + "\"}");
        return ResponseEntity.ok(ApiResponse.success(200, "저장 완료"));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable String workspaceId) {
        service.deleteSession(workspaceId);
        wsHandler.broadcast(workspaceId,
                "{\"type\":\"AI_SESSION_DELETED\",\"workspaceId\":\"" + escapeJson(workspaceId) + "\"}");
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 완료"));
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
