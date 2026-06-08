package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_schedules")
@Getter @Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSchedule {

    @Id
    @Column(name = "schedule_id", length = 50)
    private String scheduleId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "userSchedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ScheduleBlock> blocks = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.scheduleId == null) {
            this.scheduleId = java.util.UUID.randomUUID().toString();
        }
        this.updatedAt = LocalDateTime.now();
    }
}
