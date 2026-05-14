package com.campusflow.entity;

import com.campusflow.entity.enums.WorkspaceRole; // Enum 추가 필요
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 워크스페이스 멤버 엔티티
 * 유저와 워크스페이스의 다대다 관계를 중간 테이블로 관리
 * OWNER(생성자) / MEMBER(초대/참여) 역할 구분
 */
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