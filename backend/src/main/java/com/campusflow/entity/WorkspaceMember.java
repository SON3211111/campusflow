package com.campusflow.entity;

import com.campusflow.entity.enums.WorkspaceRole; // Enum 추가 필요
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workspace_members")
@Getter @Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class WorkspaceMember {

    @Id
    @Column(name = "member_id", length = 50)
    private String memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", foreignKey = @ForeignKey(name = "fk_ws_member_workspace"))
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_ws_member_user"))
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('OWNER', 'MEMBER', 'OBSERVER')")
    private WorkspaceRole role;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    public void prePersist() {
        if (this.memberId == null) {
            this.memberId = java.util.UUID.randomUUID().toString();
        }
    }
}