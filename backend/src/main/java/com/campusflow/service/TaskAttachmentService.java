package com.campusflow.service;

import com.campusflow.entity.TaskAttachment;
import com.campusflow.repository.TaskAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskAttachmentService {

    private final TaskAttachmentRepository attachmentRepository;

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

    @Transactional
    public TaskAttachment upload(String taskId, MultipartFile file, String uploaderId, String uploaderName) throws IOException {
        String ext = getExtension(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + ext;
        Path dir = Paths.get(uploadDir, "tasks", taskId);
        Files.createDirectories(dir);
        Path dest = dir.resolve(storedName);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        TaskAttachment attachment = TaskAttachment.builder()
                .taskId(taskId)
                .fileName(storedName)
                .originalName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .storagePath(dest.toString())
                .uploaderId(uploaderId)
                .uploaderName(uploaderName)
                .build();
        return attachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public List<TaskAttachment> listAttachments(String taskId) {
        return attachmentRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }

    @Transactional(readOnly = true)
    public TaskAttachment findById(String attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("첨부파일을 찾을 수 없습니다."));
    }

    @Transactional
    public void delete(String attachmentId) throws IOException {
        TaskAttachment a = findById(attachmentId);
        Files.deleteIfExists(Paths.get(a.getStoragePath()));
        attachmentRepository.delete(a);
    }

    public Resource loadAsResource(String attachmentId) throws IOException {
        TaskAttachment a = findById(attachmentId);
        Path path = Paths.get(a.getStoragePath());
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) {
            throw new RuntimeException("파일이 존재하지 않습니다: " + a.getOriginalName());
        }
        return resource;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }
}
