package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DueDateNotificationScheduler {

    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;

    // 매일 오전 9시 실행
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDueDateReminders() {
        LocalDate targetDate = LocalDate.now().plusDays(3);

        List<Task> tasks = taskRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .filter(t -> t.getStatus() != TaskStatus.DONE)
                .filter(t -> t.getAssignee() != null)
                .filter(t -> targetDate.equals(t.getDueDate()))
                .toList();

        for (Task task : tasks) {
            String message = "[" + task.getTitle() + "] 마감이 3일 남았습니다.";
            notificationRepository.save(Notification.builder()
                    .userId(task.getAssignee().getUserId())
                    .message(message)
                    .type("DUE_DATE")
                    .taskId(task.getTaskId())
                    .build());
        }
    }
}
