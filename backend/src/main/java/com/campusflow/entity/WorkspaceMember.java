package com.campusflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "workspace_members")
@NoArgsConstructor
public class WorkspaceMember {

    @Id
    @Column(name = "member_id")
    private String memberId;

    @JsonIgnore // 무한 루프 방지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @JsonIgnore // 무한 루프 방지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String role; // OWNER, MEMBER, OBSERVER

    @Column(name = "joined_at")
    private LocalDateTime joinedAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (this.memberId == null) {
            this.memberId = java.util.UUID.randomUUID().toString();
        }
    }

    // --- 직접 작성한 Getter/Setter ---
    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public Workspace getWorkspace() { return workspace; }
    public void setWorkspace(Workspace workspace) { this.workspace = workspace; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public LocalDateTime getJoinedAt() { return joinedAt; }
}