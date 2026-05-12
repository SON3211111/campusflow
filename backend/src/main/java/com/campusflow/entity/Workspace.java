package com.campusflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "workspaces")
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Workspace {

    @Id
    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type = "PERSONAL"; // PERSONAL 또는 TEAM

    @JsonIgnore // 순환 참조 및 보안을 위해 JSON 변환 시 제외
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "gradient", length = 512)
    private String gradient;

    @PrePersist
    public void prePersist() {
        if (this.workspaceId == null) {
            this.workspaceId = java.util.UUID.randomUUID().toString();
        }
    }

    // --- 직접 작성한 Getter/Setter (컴파일 에러 방지용) ---
    @JsonProperty("id")
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public String getGradient() { return gradient; }
    public void setGradient(String gradient) { this.gradient = gradient; }
}