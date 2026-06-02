package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "channels")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Channel {

    @Id
    @Column(name = "channel_id")
    private String channelId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = true)
    private User createdBy;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @PrePersist
    public void prePersist() {
        if (this.channelId == null) {
            this.channelId = java.util.UUID.randomUUID().toString();
        }
    }
}
