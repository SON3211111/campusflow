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

@org.springframework.web.bind.annotation.RestController
@org.springframework.web.bind.annotation.RequestMapping("/api/workspaces/{workspaceId}/messages")
@RequiredArgsConstructor
class WorkspaceChatController {

    private final CommentService commentService;

    @org.springframework.web.bind.annotation.GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getMessages(
            @PathVariable String workspaceId,
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "일반") String channel) {
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", commentService.getWorkspaceMessages(workspaceId, channel)));
    }

    @org.springframework.web.bind.annotation.GetMapping("/{messageId}/replies")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getReplies(@PathVariable String messageId) {
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", commentService.getReplies(messageId)));
    }

    @org.springframework.web.bind.annotation.PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> sendMessage(
            @PathVariable String workspaceId,
            @RequestBody Map<String, String> body) {
        CommentResponse saved = commentService.sendWorkspaceMessage(
                workspaceId,
                body.get("senderId"),
                body.get("content"),
                body.get("channel"),
                body.get("mentionList"),
                body.get("parentMessageId")
        );
        return ResponseEntity.ok(ApiResponse.success(200, "메시지 전송 완료", saved));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{messageId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateMessage(
            @PathVariable String messageId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(200, "수정 완료", commentService.updateMessage(messageId, body.get("content"))));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(@PathVariable String messageId) {
        commentService.deleteMessage(messageId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 완료"));
    }
}
