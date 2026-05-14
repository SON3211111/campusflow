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

    @Column(nullable = false)
    private String message;

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
