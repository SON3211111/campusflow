package com.campusflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@NoArgsConstructor
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    private String role; // 예: ROLE_USER, ROLE_ADMIN

    // [핵심] 순환 참조 방지: 유저를 조회할 때 연관된 워크스페이스 목록이 JSON에 포함되지 않도록 차단
    @JsonIgnore
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Workspace> workspaces = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.userId == null) {
            this.userId = java.util.UUID.randomUUID().toString();
        }
    }

    // --- 직접 작성한 Getter/Setter (Lombok 인식 문제 해결용) ---
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public List<Workspace> getWorkspaces() { return workspaces; }
    public void setWorkspaces(List<Workspace> workspaces) { this.workspaces = workspaces; }
}