package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Notification {

    @Id
    @Column(name = "notification_id", length = 50)
    private String notificationId;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "workspace_id", length = 50, nullable = true)
    private String workspaceId;

    @Column(nullable = false)
    private String message;

    @Column(name = "type", nullable = true)
    private String type; // STATUS_CHANGE | DUE_DATE | BOTTLENECK | QUICK_SIGNAL | QUICK_SIGNAL_SENT | COMMENT | MENTION

    @Column(name = "task_id", nullable = true)
    private String taskId;

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.notificationId == null) {
            this.notificationId = java.util.UUID.randomUUID().toString();
        }
    }
}
