package com.campusflow.service;

import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.dto.TaskResponse;
import com.campusflow.entity.Task;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 태스크 비즈니스 로직 서비스
 * 소프트 삭제 패턴: 실제 DB에서 삭제하지 않고 deleted 플래그로 휴지통 기능 구현
 */
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;

    /** 활성 태스크(deleted=false)만 조회 */
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId)
                .stream().map(TaskResponse::from).toList();
    }

    /** 휴지통 조회: deleted=true인 태스크만 반환 */
    @Transactional(readOnly = true)
    public List<TaskResponse> getDeletedTasks(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedTrue(workspaceId)
                .stream().map(TaskResponse::from).toList();
    }

    /**
     * 태스크 생성
     * 상태값과 마감일은 잘못된 형식 입력 시 기본값(TODO, null)으로 처리
     */
    @Transactional
    public TaskResponse createTask(String workspaceId, TaskCreateRequest req) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));
        // 유효하지 않은 상태값이면 기본값 TODO로 설정
        TaskStatus status = TaskStatus.TODO;
        if (req.status() != null && !req.status().isBlank()) {
            try { status = TaskStatus.valueOf(req.status()); } catch (IllegalArgumentException ignored) {}
        }
        // 날짜 파싱 실패 시 null(미설정) 처리
        LocalDate dueDate = null;
        if (req.dueDate() != null && !req.dueDate().isBlank()) {
            try { dueDate = LocalDate.parse(req.dueDate()); } catch (Exception ignored) {}
        }
        Task task = Task.builder()
                .title(req.title())
                .description(req.description() != null ? req.description() : "")
                .status(status)
                .dueDate(dueDate)
                .deleted(false)
                .workspace(workspace)
                .build();
        return TaskResponse.from(taskRepository.save(task));
    }

    /** 소프트 삭제: deleted=true, deletedAt=현재시각 기록 */
    @Transactional
    public void deleteTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found. ID: " + taskId));
        task.setDeleted(true);
        task.setDeletedAt(LocalDateTime.now());
    }

    /** 휴지통 복원: deleted=false, deletedAt=null 로 되돌림 */
    @Transactional
    public TaskResponse restoreTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found. ID: " + taskId));
        task.setDeleted(false);
        task.setDeletedAt(null);
        return TaskResponse.from(task);
    }

    /** 칸반 보드: 상태별로 그룹화된 태스크 맵 반환 */
    @Transactional(readOnly = true)
    public Map<TaskStatus, List<Task>> getKanbanBoard(String workspaceId) {
        List<Task> tasks = taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId);
        return tasks.stream().collect(Collectors.groupingBy(Task::getStatus));
    }

    /** 드래그앤드롭으로 상태 변경 시 호출 */
    @Transactional
    public void updateTaskStatus(String taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setStatus(newStatus);
    }

    /** 마감일 수정 (빈 문자열 또는 null 전달 시 마감일 제거) */
    @Transactional
    public void updateTaskDueDate(String taskId, String dueDate) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDueDate(dueDate != null && !dueDate.isBlank() ? LocalDate.parse(dueDate) : null);
    }
}
