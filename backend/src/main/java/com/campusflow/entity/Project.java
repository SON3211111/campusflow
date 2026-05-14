package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectId;

    private String title;

    private String description;

    // --- 초대 관련 필드 ---
    @Column(unique = true, length = 50)
    private String inviteCode;

    private LocalDateTime inviteExpiry;

    @Builder.Default
    private Boolean isInviteActive = true;

    // --- [추가] 대시보드 시각화를 위한 양방향 관계 ---
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();

    // 초대 코드 자동 생성 로직 (필요 시 추가)
    @PrePersist
    public void prePersist() {
        if (this.inviteCode == null) {
            this.inviteCode = java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        if (this.inviteExpiry == null) {
            this.inviteExpiry = LocalDateTime.now().plusDays(7);
        }
    }
}