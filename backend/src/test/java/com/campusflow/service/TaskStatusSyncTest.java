package com.campusflow.service;

import com.campusflow.entity.Task;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.TaskStatusHistoryRepository;
import com.campusflow.websocket.TaskWebSocketHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskStatusSyncTest {
    @Mock TaskRepository tasks;
    @Mock TaskStatusHistoryRepository history;
    @Mock NotificationService notifications;
    @Mock TaskWebSocketHandler socket;
    @InjectMocks TaskService service;

    private Task existing(TaskStatus status, String column) {
        Task task = Task.builder().taskId("task").status(status).boardColumn(column)
                .workspace(Workspace.builder().workspaceId("workspace").build()).build();
        when(tasks.findById("task")).thenReturn(Optional.of(task));
        return task;
    }

    @ParameterizedTest
    @CsvSource({"TODO,상태 없음", "REVIEW,시작하지 않음", "DOING,진행 중", "ISSUE,보류 중", "DONE,완료"})
    void explicitStatusMovesCardAndBroadcasts(TaskStatus status, String column) {
        Task task = existing(status == TaskStatus.DONE ? TaskStatus.DOING : TaskStatus.DONE, "사용자 정의");
        service.updateTaskStatus("task", status, null);
        assertEquals(status, task.getStatus());
        assertEquals(column, task.getBoardColumn());
        verify(history).save(any());
        verify(socket).broadcast(eq("workspace"), contains("\"newStatus\":\"" + status + "\""));
    }

    @Test
    void repeatedCompletionRepairsOldColumnWithoutDuplicateSideEffects() {
        Task task = existing(TaskStatus.DONE, "진행 중");
        service.updateTaskStatus("task", TaskStatus.DONE, null);
        assertEquals("완료", task.getBoardColumn());
        verifyNoInteractions(history, notifications);
        verify(socket).broadcast(eq("workspace"), anyString());
    }

    @Test
    void customColumnMovePreservesStatus() {
        Task task = existing(TaskStatus.DOING, "진행 중");
        service.updateBoardColumn("task", "검토 대기");
        assertEquals("검토 대기", task.getBoardColumn());
        assertEquals(TaskStatus.DOING, task.getStatus());
        verifyNoInteractions(history, notifications);
    }
}
