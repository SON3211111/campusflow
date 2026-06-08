package com.campusflow.entity;

import com.campusflow.entity.enums.TaskPriority;
import com.campusflow.entity.enums.TaskStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Task {
    @Id
    @Column(name = "task_id")
    private String taskId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @JsonIgnore
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    @JsonIgnore
    private User assignee;

    @Builder.Default
    @Column(name = "is_ai_generated", nullable = false)
    private boolean isAiGenerated = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = true)
    private TaskPriority priority;

    @Column(name = "estimated_hours", nullable = true)
    private Integer estimatedHours;

    @Builder.Default
    @Column(name = "is_locked", nullable = false)
    private boolean isLocked = false;

    @Column(name = "locked_by", nullable = true)
    private String lockedBy;

    @Column(name = "quick_signal", nullable = true)
    private String quickSignal; // HELP_NEEDED | FEEDBACK_NEEDED | null

    @Column(name = "board_column", length = 100)
    private String boardColumn;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    @JsonIgnore
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private Task parentTask;

    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Task> subTasks = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.taskId == null) {
            this.taskId = java.util.UUID.randomUUID().toString();
        }
    }
}
