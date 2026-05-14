package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 팀원별 기여도 측정 엔티티
 * 특정 프로젝트에서 각 유저가 완료한 태스크 수와 이슈 해결 수를 기록
 */
@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@Table(name = "contribution_metrics")
public class ContributionMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private int taskCompletionCount;
    private int issueSolvingCount;
}