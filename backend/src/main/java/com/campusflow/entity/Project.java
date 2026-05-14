package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 프로젝트 엔티티 (ContributionMetrics 분석에서 참조)
 * 현재는 기본 구조만 정의되어 있으며, 추후 확장 예정
 */
@Entity @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectId;

    private String title;
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    // --- 초대 관련 필드 ---
    @Column(unique = true, length = 50)
    private String inviteCode;

    private LocalDateTime inviteExpiry;

    @Builder.Default
    private Boolean isInviteActive = true;
}