package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_task_session")
@Getter @Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AiTaskSession {

    @Id
    @Column(name = "workspace_id", length = 50)
    private String workspaceId;

    @Column(name = "session_data", columnDefinition = "LONGTEXT", nullable = false)
    private String sessionData;

    @Column(name = "created_by", length = 50, nullable = true)
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
