package com.campusflow.entity;

import com.campusflow.entity.enums.TaskStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 태스크(업무) 엔티티
 * 소프트 삭제 방식으로 deleted=true 시 휴지통 처리,
 * 부모-자식 관계로 서브태스크 계층 구조 지원
 */
@Entity
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Task {
    @Id
    @Column(name = "task_id")
    private String taskId;  // UUID 자동 생성

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // 칸반 보드 컬럼 상태: TODO / DOING / ISSUE / REVIEW / DONE
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @Column(name = "due_date")
    private LocalDate dueDate;  // 마감일 (null이면 미설정)

    // 소프트 삭제 여부: true면 휴지통으로 이동
    @Builder.Default
    @Column(name = "is_ai_generated")
    private boolean isAiGenerated = false;

    @Builder.Default
    @Column(name = "deleted")
    private boolean deleted = false;

    // 삭제 시각 기록 (복원 시 null로 초기화)
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // 태스크가 속한 워크스페이스 (지연 로딩)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    @JsonIgnore
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    @JsonIgnore
    private User assignee;

    // AI 세부 분할에서 사용하는 상위 태스크 참조
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private Task parentTask;

    // 서브태스크 목록 (부모 태스크 삭제 시 함께 삭제)
    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> subTasks = new ArrayList<>();

    // taskId가 없으면 UUID 자동 생성 (DB INSERT 전 호출)
    @PrePersist
    public void prePersist() {
        if (this.taskId == null) {
            this.taskId = java.util.UUID.randomUUID().toString();
        }
    }
}
