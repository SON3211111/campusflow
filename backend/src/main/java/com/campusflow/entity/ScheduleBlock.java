package com.campusflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "schedule_blocks")
@Getter @Setter  // 💡 롬복이 정상 작동하도록 확실히 명시
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleBlock {

    @Id
    @Column(name = "block_id", length = 50)
    private String blockId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private UserSchedule userSchedule;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('CLASS', 'PRIVATE', 'TASK', 'FREE')")
    private ScheduleCategory category;

    @Column(length = 255)
    private String title;

    @Column(name = "day_of_week", length = 20)
    private String dayOfWeek;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @PrePersist
    public void prePersist() {
        if (this.blockId == null) {
            this.blockId = java.util.UUID.randomUUID().toString();
        }
    }
}