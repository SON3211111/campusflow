package com.campusflow.service;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.TaskStatusHistoryRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.websocket.TaskWebSocketHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskStatusColumnTest {
    @Mock TaskRepository tasks;
    @Mock TaskStatusHistoryRepository history;
    @Mock UserRepository users;
    @Mock NotificationService notifications;
    @Mock TaskWebSocketHandler socket;
    @InjectMocks TaskService service;

    @Test void statusChangeClearsStaleWebColumn() {
        Task task = Task.builder().taskId("task").title("업무").status(TaskStatus.DOING).boardColumn("진행 중").build();
        when(tasks.findById("task")).thenReturn(Optional.of(task));
        service.updateTaskStatus("task", TaskStatus.DONE, null);
        assertEquals(TaskStatus.DONE, task.getStatus());
        assertNull(task.getBoardColumn());
        verify(history).save(any());
    }

    @Test void sameStatusPreservesCustomColumn() {
        Task task = Task.builder().taskId("task").title("업무").status(TaskStatus.DOING).boardColumn("프론트엔드").build();
        when(tasks.findById("task")).thenReturn(Optional.of(task));
        service.updateTaskStatus("task", TaskStatus.DOING, null);
        assertEquals("프론트엔드", task.getBoardColumn());
    }
}
