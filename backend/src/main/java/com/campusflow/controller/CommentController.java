package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.CommentResponse;
import com.campusflow.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks/{taskId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(
            @PathVariable String taskId) {
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", commentService.getComments(taskId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable String workspaceId,
            @PathVariable String taskId,
            @RequestBody Map<String, String> body) {
        String senderId = body.get("senderId");
        String content  = body.get("content");
        CommentResponse saved = commentService.addComment(workspaceId, taskId, senderId, content);
        return ResponseEntity.ok(ApiResponse.success(200, "댓글 저장 완료", saved));
    }
}
