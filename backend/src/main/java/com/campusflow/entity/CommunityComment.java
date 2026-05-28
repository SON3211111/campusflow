package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "community_comments")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityComment {

    @Id
    @Column(name = "comment_id", length = 50)
    private String commentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User helper;

    // 💡 대댓글 핵심: 셀프 참조 부모 댓글 구조
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private CommunityComment parent;

    // 💡 대댓글 핵심: 자식 대댓글 목록
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @OrderBy("createdAt ASC")
    private List<CommunityComment> replies = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_adopted", nullable = false)
    private boolean isAdopted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.commentId == null) {
            this.commentId = java.util.UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
        this.isAdopted = false;
    }
}