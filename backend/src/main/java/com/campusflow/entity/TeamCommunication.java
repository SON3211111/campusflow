package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_communication")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class TeamCommunication {

    @Id
    @Column(name = "message_id")
    private String messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    // null = 워크스페이스 채팅, not null = 태스크 댓글
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = true)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    // null = 최상위 메시지, not null = 답글
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_msg_id", nullable = true)
    private TeamCommunication parentMessage;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Builder.Default
    @Column(name = "channel", nullable = false)
    private String channel = "일반";

    @Column(name = "mention_list", columnDefinition = "TEXT", nullable = true)
    private String mentionList; // JSON 배열 형태: ["userId1","userId2"]

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (this.messageId == null) {
            this.messageId = java.util.UUID.randomUUID().toString();
        }
    }
}
