package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import com.campusflow.entity.enums.TaskStatus;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long taskId;
    private String title;

    @Enumerated(EnumType.STRING)
    private TaskStatus status;

    @ManyToOne @JoinColumn(name = "project_id")
    private Project project;
}