package com.campusflow.repository;

import com.campusflow.entity.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, String> {
    List<TaskAttachment> findByTaskIdOrderByCreatedAtDesc(String taskId);
}
