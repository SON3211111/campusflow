package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.TaskStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DueDateNotificationScheduler {

    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final TaskStatusHistoryRepository taskStatusHistoryRepository;

    // 매일 오전 9시 — 마감 D-3 알림
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDueDateReminders() {
        LocalDate targetDate = LocalDate.now().plusDays(3);

        taskRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .filter(t -> t.getStatus() != TaskStatus.DONE)
                .filter(t -> t.getAssignee() != null)
                .filter(t -> targetDate.equals(t.getDueDate()))
                .forEach(task -> notificationRepository.save(Notification.builder()
                        .userId(task.getAssignee().getUserId())
                        .message("[" + task.getTitle() + "] 마감이 3일 남았습니다.")
                        .type("DUE_DATE")
                        .taskId(task.getTaskId())
                        .build()));
    }

    // 매일 오전 9시 — 병목 태스크 알림 (DOING/ISSUE 3일 이상 정체)
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendBottleneckAlerts() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(3);
        List<TaskStatus> stuckStatuses = List.of(TaskStatus.DOING, TaskStatus.ISSUE);

        // 각 태스크별 가장 최근 히스토리
        Map<String, LocalDateTime> lastChangedMap = taskStatusHistoryRepository.findAll().stream()
                .collect(Collectors.toMap(
                        h -> h.getTask().getTaskId(),
                        h -> h.getOccurredAt(),
                        (a, b) -> a.isAfter(b) ? a : b
                ));

        taskRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .filter(t -> stuckStatuses.contains(t.getStatus()))
                .filter(t -> t.getAssignee() != null)
                .filter(t -> {
                    LocalDateTime lastChanged = lastChangedMap.get(t.getTaskId());
                    return lastChanged != null && lastChanged.isBefore(threshold);
                })
                .forEach(task -> {
                    String statusLabel = task.getStatus() == TaskStatus.DOING ? "진행 중" : "보류 중";
                    notificationRepository.save(Notification.builder()
                            .userId(task.getAssignee().getUserId())
                            .message("[" + task.getTitle() + "]이(가) 3일 이상 " + statusLabel + " 상태입니다.")
                            .type("BOTTLENECK")
                            .taskId(task.getTaskId())
                            .build());
                });
    }
}
