package com.campusflow.entity;

import com.campusflow.entity.enums.WorkspaceType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workspaces")
@Getter @Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Workspace {

    @Id
    @Column(name = "workspace_id", length = 50)
    private String workspaceId;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(columnDefinition = "ENUM('PERSONAL', 'TEAM') DEFAULT 'PERSONAL'")
    private WorkspaceType type = WorkspaceType.PERSONAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // UI 디자인을 위한 필드 (DB에 추가 필수)
    @Column(name = "gradient", length = 512)
    private String gradient;

    @PrePersist
    public void prePersist() {
        if (this.workspaceId == null) {
            this.workspaceId = java.util.UUID.randomUUID().toString();
        }
    }
}