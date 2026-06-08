package com.campusflow.dto;

import com.campusflow.entity.TaskAttachment;

public record AttachmentResponse(
        String attachmentId,
        String originalName,
        String fileType,
        long fileSize,
        String uploaderName,
        String createdAt
) {
    public static AttachmentResponse from(TaskAttachment a) {
        return new AttachmentResponse(
                a.getAttachmentId(),
                a.getOriginalName(),
                a.getFileType() != null ? a.getFileType() : "",
                a.getFileSize() != null ? a.getFileSize() : 0L,
                a.getUploaderName() != null ? a.getUploaderName() : "",
                a.getCreatedAt() != null ? a.getCreatedAt().toString() : ""
        );
    }
}
