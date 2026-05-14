package com.campusflow.service;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.entity.Project;
import com.campusflow.entity.Task;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;

    // ── 칸반 보드 ────────────────────────────────────────────

    /** 워크스페이스의 활성 태스크 목록 반환 (소프트 삭제 제외) */
    @Transactional(readOnly = true)
    public List<Task> getActiveTasks(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId);
    }

    /** 워크스페이스의 소프트 삭제된 태스크 목록 반환 (휴지통) */
    @Transactional(readOnly = true)
    public List<Task> getDeletedTasks(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedTrue(workspaceId);
    }

    /** 태스크 생성 후 저장된 엔티티 반환 */
    @Transactional
    public Task createTask(String workspaceId, TaskCreateRequest req) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        // status 문자열 → Enum 변환 (잘못된 값이면 TODO로 폴백)
        TaskStatus status;
        try {
            status = TaskStatus.valueOf(req.status() != null ? req.status() : "TODO");
        } catch (IllegalArgumentException e) {
            status = TaskStatus.TODO;
        }

        // assigneeId가 있으면 담당자 조회 (없으면 null → 미배정)
        User assignee = null;
        if (req.assigneeId() != null && !req.assigneeId().isBlank()) {
            assignee = userRepository.findById(req.assigneeId()).orElse(null);
        }

        Task task = Task.builder()
                .workspace(workspace)
                .title(req.title())
                .description(req.description())
                .status(status)
                .assignee(assignee)
                .deleted(false)
                .build();

        return taskRepository.save(task);
    }

    /** 태스크 상태 변경 (칸반 드래그앤드롭) */
    @Transactional
    public void updateTaskStatus(String taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setStatus(newStatus);
    }

    /** 태스크 소프트 삭제 (DB에서 제거하지 않고 isDeleted=true로 마킹) */
    @Transactional
    public void softDeleteTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDeleted(true);
        task.setDeletedAt(LocalDateTime.now());
    }

    /** 휴지통에서 태스크 복원 (isDeleted=false 로 되돌림) */
    @Transactional
    public Task restoreTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDeleted(false);
        task.setDeletedAt(null);
        return task;
    }

    /** 마감일 업데이트 (yyyy-MM-dd 형식 문자열) */
    @Transactional
    public void updateDueDate(String taskId, String dueDate) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDueDate(LocalDate.parse(dueDate));
    }

    /** 태스크 설명 업데이트 */
    @Transactional
    public void updateDescription(String taskId, String description) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDescription(description);
    }

    // ── 기존: 칸반 맵 조회 (TaskController에서 사용) ─────────

    /** 상태별 그룹화된 태스크 맵 반환 */
    @Transactional(readOnly = true)
    public Map<TaskStatus, List<Task>> getKanbanBoard(String workspaceId) {
        List<Task> tasks = taskRepository.findAllByWorkspace_WorkspaceId(workspaceId);
        return tasks.stream().collect(Collectors.groupingBy(Task::getStatus));
    }

    // ── 대시보드 시각화 ──────────────────────────────────────

    /** 프로젝트 진행률 및 상태 분포 계산 */
    @Transactional(readOnly = true)
    public ProjectProgressDto getProjectProgress(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));

        List<Task> tasks = taskRepository.findAllByProject_ProjectId(projectId);

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count();

        double progressRate = (totalTasks == 0) ? 0 : ((double) completedTasks / totalTasks) * 100;

        Map<String, Long> distribution = tasks.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        return new ProjectProgressDto(
                project.getProjectId().toString(),
                project.getTitle(),
                Math.round(progressRate * 100) / 100.0,
                totalTasks,
                completedTasks,
                distribution
        );
    }

    // ── AI 장바구니 ──────────────────────────────────────────

    /** AI가 제안한 태스크 목록을 프로젝트에 일괄 할당 */
    @Transactional
    public void addAiTasksToProject(Long projectId, String userId, List<Task> aiProposedTasks) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        for (Task aiTask : aiProposedTasks) {
            aiTask.setProject(project);
            aiTask.setAssignee(user);
            aiTask.setAiGenerated(true);
            aiTask.setStatus(TaskStatus.TODO);
            taskRepository.save(aiTask);
        }
    }
}
