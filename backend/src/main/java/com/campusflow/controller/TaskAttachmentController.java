package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.AttachmentResponse;
import com.campusflow.entity.TaskAttachment;
import com.campusflow.service.TaskAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks/{taskId}/attachments")
@RequiredArgsConstructor
public class TaskAttachmentController {

    private final TaskAttachmentService attachmentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AttachmentResponse>> upload(
            @PathVariable String taskId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String uploaderId,
            @RequestParam(required = false) String uploaderName) throws IOException {
        TaskAttachment saved = attachmentService.upload(taskId, file, uploaderId, uploaderName);
        return ResponseEntity.ok(ApiResponse.success(200, "업로드 성공", AttachmentResponse.from(saved)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> list(@PathVariable String taskId) {
        List<AttachmentResponse> result = attachmentService.listAttachments(taskId)
                .stream().map(AttachmentResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", result));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String attachmentId) throws IOException {
        attachmentService.delete(attachmentId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 완료"));
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable String attachmentId) throws IOException {
        Resource resource = attachmentService.loadAsResource(attachmentId);
        TaskAttachment a = attachmentService.findById(attachmentId);
        String mimeType = a.getFileType() != null ? a.getFileType() : "application/octet-stream";
        String encoded = URLEncoder.encode(a.getOriginalName(), StandardCharsets.UTF_8).replace("+", "%20");

        // 이미지는 inline(브라우저 표시), 나머지는 attachment(다운로드)
        String disposition = mimeType.startsWith("image/")
                ? "inline; filename*=UTF-8''" + encoded
                : "attachment; filename*=UTF-8''" + encoded;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(resource);
    }
}
