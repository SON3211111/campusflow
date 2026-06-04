package com.campusflow.repository;

import com.campusflow.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdAndReadFalse(String userId);
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndWorkspaceIdOrderByCreatedAtDesc(String userId, String workspaceId);
    boolean existsByTaskIdAndTypeAndReadFalse(String taskId, String type);
}
