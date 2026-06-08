package com.campusflow.service;

import com.campusflow.dto.ActivityFeedItemDto;
import com.campusflow.dto.BottleneckReportDto;
import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.dto.TaskCreateRequest;
import com.campusflow.dto.TaskResponse;
import com.campusflow.entity.ContributionMetrics;
import com.campusflow.entity.Project;
import com.campusflow.entity.Task;
import com.campusflow.entity.TaskStatusHistory;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.TaskPriority;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.ContributionMetricsRepository;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.TaskStatusHistoryRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.websocket.TaskWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final TaskStatusHistoryRepository taskStatusHistoryRepository;
    private final ContributionMetricsRepository contributionMetricsRepository;
    private final NotificationService notificationService;
    private final TaskWebSocketHandler taskWebSocketHandler;

    // ── 칸반 보드 ────────────────────────────────────────────

    /**
     * 워크스페이스의 활성 태스크 목록 (소프트 삭제 제외).
     * DTO 변환은 동일 트랜잭션 안에서 수행해 assignee 지연 로딩으로 인한 500을 방지한다.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getActiveTaskResponses(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    /** 워크스페이스의 소프트 삭제된 태스크 목록 (휴지통) */
    @Transactional(readOnly = true)
    public List<TaskResponse> getDeletedTaskResponses(String workspaceId) {
        return taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedTrue(workspaceId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    /** 태스크 생성 후 DTO 반환 (트랜잭션 안에서 LAZY 로딩 완료) */
    @Transactional
    public TaskResponse createTask(String workspaceId, TaskCreateRequest req) {
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

        TaskPriority priority = null;
        if (req.priority() != null && !req.priority().isBlank()) {
            try { priority = TaskPriority.valueOf(req.priority()); } catch (IllegalArgumentException ignored) {}
        }

        LocalDate startDate = null;
        if (req.startDate() != null && !req.startDate().isBlank()) {
            try { startDate = LocalDate.parse(req.startDate()); } catch (Exception ignored) {}
        }

        Task task = Task.builder()
                .workspace(workspace)
                .title(req.title())
                .description(req.description())
                .status(status)
                .assignee(assignee)
                .priority(priority)
                .startDate(startDate)
                .boardColumn(req.boardColumn())
                .deleted(false)
                .build();

        Task saved = taskRepository.save(task);
        // 팀원들에게 새 카드 생성 알림
        String assigneeId   = saved.getAssignee() != null ? saved.getAssignee().getUserId() : "";
        String assigneeName = saved.getAssignee() != null ? saved.getAssignee().getName()   : "";
        String createJson = String.format(
            "{\"type\":\"TASK_CREATED\",\"taskId\":\"%s\",\"title\":\"%s\",\"status\":\"%s\",\"assigneeId\":\"%s\",\"assigneeName\":\"%s\",\"priority\":\"%s\",\"boardColumn\":\"%s\"}",
            escapeJson(saved.getTaskId()),
            escapeJson(saved.getTitle()),
            escapeJson(saved.getStatus().name()),
            escapeJson(assigneeId),
            escapeJson(assigneeName),
            saved.getPriority() != null ? saved.getPriority().name() : "",
            escapeJson(saved.getBoardColumn())
        );
        taskWebSocketHandler.broadcast(workspaceId, createJson);
        return TaskResponse.from(saved);
    }

    @Transactional
    public void updateBoardColumn(String taskId, String boardColumn) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setBoardColumn(boardColumn == null || boardColumn.isBlank() ? null : boardColumn);
        broadcastTaskUpdated(task, "boardColumn", task.getBoardColumn());
    }

    /** 태스크 상태 변경 (칸반 드래그앤드롭) — 히스토리 기록 + DONE 시 기여도 업데이트 */
    @Transactional
    public void updateTaskStatus(String taskId, TaskStatus newStatus, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));

        TaskStatus prevStatus = task.getStatus();
        task.setStatus(newStatus);

        User changedBy = (userId != null && !userId.isBlank())
                ? userRepository.findById(userId).orElse(null)
                : null;

        taskStatusHistoryRepository.save(TaskStatusHistory.builder()
                .task(task)
                .workspace(task.getWorkspace())
                .prevStatus(prevStatus)
                .currStatus(newStatus)
                .changedBy(changedBy)
                .build());

        if (newStatus == TaskStatus.DONE && task.getAssignee() != null && task.getProject() != null) {
            updateContributionMetrics(task.getProject(), task.getAssignee(), prevStatus == TaskStatus.ISSUE);
        }

        notificationService.notifyStatusChange(task, prevStatus, newStatus, userId);

        if (task.getWorkspace() != null) {
            String wsId = task.getWorkspace().getWorkspaceId();
            String json = String.format(
                "{\"type\":\"STATUS_CHANGE\",\"taskId\":\"%s\",\"newStatus\":\"%s\",\"changedByUserId\":\"%s\"}",
                task.getTaskId(), newStatus.name(), userId != null ? userId : ""
            );
            taskWebSocketHandler.broadcast(wsId, json);
        }
    }

    /** 활동 피드 — task_status_history 최근 N건 */
    @Transactional(readOnly = true)
    public List<ActivityFeedItemDto> getActivityFeed(String workspaceId, int limit) {
        return taskStatusHistoryRepository
                .findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(workspaceId, PageRequest.of(0, limit))
                .stream()
                .map(ActivityFeedItemDto::from)
                .toList();
    }

    /** 병목 태스크 — DOING/ISSUE 상태로 N일 이상 변경 없는 태스크 */
    @Transactional(readOnly = true)
    public List<TaskResponse> getBottleneckTasks(String workspaceId, int days) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(days);
        List<TaskStatus> stuckStatuses = List.of(TaskStatus.DOING, TaskStatus.ISSUE);

        List<Task> candidates = taskRepository
                .findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId)
                .stream()
                .filter(t -> stuckStatuses.contains(t.getStatus()))
                .toList();

        // 히스토리가 있는 태스크 중 마지막 변경이 threshold 이전인 것만 반환
        Set<String> stuckIds = taskStatusHistoryRepository
                .findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(workspaceId)
                .stream()
                .collect(Collectors.toMap(
                        h -> h.getTask().getTaskId(),
                        h -> h,
                        (a, b) -> a   // 가장 최근 것만 유지
                ))
                .entrySet().stream()
                .filter(e -> e.getValue().getOccurredAt().isBefore(threshold))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        return candidates.stream()
                .filter(t -> stuckIds.contains(t.getTaskId()))
                .map(TaskResponse::from)
                .toList();
    }

    /**
     * 병목 영향 리포트
     * - 병목 태스크별 정체 일수, 후속 영향 업무 목록, 예상 지연일 계산
     * - task_dependencies 없이 dueDate 기준으로 후속 업무를 휴리스틱하게 추정
     */
    @Transactional(readOnly = true)
    public BottleneckReportDto getBottleneckReport(String workspaceId, int thresholdDays) {
        List<Task> allActive = taskRepository.findAllByWorkspace_WorkspaceIdAndDeletedFalse(workspaceId);
        List<TaskStatus> stuckStatuses = List.of(TaskStatus.DOING, TaskStatus.ISSUE);

        // 태스크별 마지막 상태 변경 시각 맵핑
        Map<String, java.time.LocalDateTime> lastChangedMap = taskStatusHistoryRepository
                .findAllByWorkspace_WorkspaceIdOrderByOccurredAtDesc(workspaceId)
                .stream()
                .collect(Collectors.toMap(
                        h -> h.getTask().getTaskId(),
                        h -> h.getOccurredAt(),
                        (a, b) -> a
                ));

        java.time.LocalDateTime threshold = java.time.LocalDateTime.now().minusDays(thresholdDays);

        // 전체 태스크 중 가장 늦은 dueDate (프로젝트 마감일 기준)
        java.time.LocalDate projectDeadline = allActive.stream()
                .filter(t -> t.getDueDate() != null && t.getStatus() != TaskStatus.DONE)
                .map(Task::getDueDate)
                .max(java.time.LocalDate::compareTo)
                .orElse(null);

        int maxDelayDays = 0;

        List<BottleneckReportDto.BottleneckItem> items = new java.util.ArrayList<>();

        for (Task t : allActive) {
            if (!stuckStatuses.contains(t.getStatus())) continue;
            java.time.LocalDateTime lastChanged = lastChangedMap.get(t.getTaskId());
            if (lastChanged == null || !lastChanged.isBefore(threshold)) continue;

            // 정체 일수 계산
            long daysStuck = java.time.temporal.ChronoUnit.DAYS.between(lastChanged, java.time.LocalDateTime.now());
            int delayDays = (int) Math.max(daysStuck - thresholdDays, 0);
            maxDelayDays = Math.max(maxDelayDays, delayDays);

            // 후속 영향 업무: dueDate가 이 태스크 이후이거나, dueDate 없는 미완료 태스크
            List<BottleneckReportDto.AffectedTask> affected = allActive.stream()
                    .filter(a -> !a.getTaskId().equals(t.getTaskId()))
                    .filter(a -> a.getStatus() != TaskStatus.DONE)
                    .filter(a -> {
                        if (t.getDueDate() == null) return true; // 병목에 마감일 없으면 전체 영향
                        if (a.getDueDate() == null) return true; // 후속도 마감일 없으면 영향받을 수 있음
                        return !a.getDueDate().isBefore(t.getDueDate()); // 병목 이후 마감이면 영향
                    })
                    .map(a -> new BottleneckReportDto.AffectedTask(
                            a.getTaskId(),
                            a.getTitle(),
                            a.getDueDate() != null ? a.getDueDate().toString() : null,
                            a.getStatus().name(),
                            a.getAssignee() != null ? a.getAssignee().getName() : null
                    ))
                    .toList();

            items.add(new BottleneckReportDto.BottleneckItem(
                    t.getTaskId(),
                    t.getTitle(),
                    t.getStatus().name(),
                    (int) daysStuck,
                    delayDays,
                    t.getAssignee() != null ? t.getAssignee().getName() : null,
                    t.getDueDate() != null ? t.getDueDate().toString() : null,
                    affected.size(),
                    affected
            ));
        }

        // 예상 새 마감일 계산
        String deadlineStr = projectDeadline != null ? projectDeadline.toString() : null;
        String newDeadlineStr = (projectDeadline != null && maxDelayDays > 0)
                ? projectDeadline.plusDays(maxDelayDays).toString()
                : deadlineStr;

        return new BottleneckReportDto(items, maxDelayDays, deadlineStr, newDeadlineStr);
    }

    private void updateContributionMetrics(Project project, User user, boolean issueSolved) {
        ContributionMetrics metrics = contributionMetricsRepository
                .findByProject_ProjectIdAndUser_UserId(project.getProjectId(), user.getUserId())
                .orElseGet(() -> ContributionMetrics.builder()
                        .project(project)
                        .user(user)
                        .taskCompletionCount(0)
                        .issueSolvingCount(0)
                        .build());
        metrics.setTaskCompletionCount(metrics.getTaskCompletionCount() + 1);
        if (issueSolved) {
            metrics.setIssueSolvingCount(metrics.getIssueSolvingCount() + 1);
        }
        contributionMetricsRepository.save(metrics);
    }

    /** 태스크 소프트 삭제 (DB에서 제거하지 않고 isDeleted=true로 마킹) */
    @Transactional
    public void softDeleteTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDeleted(true);
        task.setDeletedAt(LocalDateTime.now());
        // 팀원들에게 카드 삭제 알림
        if (task.getWorkspace() != null) {
            String json = String.format(
                "{\"type\":\"TASK_DELETED\",\"taskId\":\"%s\"}", task.getTaskId()
            );
            taskWebSocketHandler.broadcast(task.getWorkspace().getWorkspaceId(), json);
        }
    }

    /** 휴지통에서 태스크 복원 (isDeleted=false 로 되돌림) */
    @Transactional
    public TaskResponse restoreTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDeleted(false);
        task.setDeletedAt(null);
        // 팀원들에게 카드 복원 알림
        if (task.getWorkspace() != null) {
            String assigneeId   = task.getAssignee() != null ? task.getAssignee().getUserId() : "";
            String assigneeName = task.getAssignee() != null ? task.getAssignee().getName()   : "";
            String json = String.format(
                "{\"type\":\"TASK_RESTORED\",\"taskId\":\"%s\",\"title\":\"%s\",\"status\":\"%s\",\"assigneeId\":\"%s\",\"assigneeName\":\"%s\",\"priority\":\"%s\",\"boardColumn\":\"%s\"}",
                escapeJson(task.getTaskId()),
                escapeJson(task.getTitle()),
                escapeJson(task.getStatus().name()),
                escapeJson(assigneeId),
                escapeJson(assigneeName),
                task.getPriority() != null ? task.getPriority().name() : "",
                escapeJson(task.getBoardColumn())
            );
            taskWebSocketHandler.broadcast(task.getWorkspace().getWorkspaceId(), json);
        }
        return TaskResponse.from(task);
    }

    /** 마감일 업데이트 (yyyy-MM-dd 형식 문자열) */
    @Transactional
    public void updateDueDate(String taskId, String dueDate) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDueDate(LocalDate.parse(dueDate));
        broadcastTaskUpdated(task, "dueDate", dueDate);
    }

    /** 시작일 업데이트 (yyyy-MM-dd 형식 문자열, 빈 문자열이면 null로 초기화) */
    @Transactional
    public void updateStartDate(String taskId, String startDate) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setStartDate(startDate == null || startDate.isBlank() ? null : LocalDate.parse(startDate));
        broadcastTaskUpdated(task, "startDate", startDate);
    }

    /** 담당자 변경 */
    @Transactional
    public TaskResponse updateAssignee(String taskId, String assigneeId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        if (assigneeId == null || assigneeId.isBlank()) {
            task.setAssignee(null);
        } else {
            User user = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
            task.setAssignee(user);
        }
        Task saved = taskRepository.save(task);
        String newAssigneeName = saved.getAssignee() != null ? saved.getAssignee().getName() : "";
        broadcastTaskUpdated(task, "assigneeName", newAssigneeName);
        return TaskResponse.from(saved);
    }

    /** 태스크 설명 업데이트 */
    @Transactional
    public void updateDescription(String taskId, String description) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setDescription(description);
        broadcastTaskUpdated(task, "description", description);
    }

    /** 태스크 제목 업데이트 */
    @Transactional
    public void updateTitle(String taskId, String title) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setTitle(title);
        broadcastTaskUpdated(task, "title", title);
    }

    /** 공통 TASK_UPDATED 브로드캐스트 헬퍼 */
    private void broadcastTaskUpdated(Task task, String field, String value) {
        if (task.getWorkspace() == null) return;
        String json = String.format(
            "{\"type\":\"TASK_UPDATED\",\"taskId\":\"%s\",\"field\":\"%s\",\"value\":\"%s\"}",
            escapeJson(task.getTaskId()), escapeJson(field), escapeJson(value)
        );
        taskWebSocketHandler.broadcast(task.getWorkspace().getWorkspaceId(), json);
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    /** 퀵 시그널 — 도움/피드백 요청 → 팀원 알림 */
    @Transactional
    public void sendQuickSignal(String taskId, String signal, String requesterId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setQuickSignal(signal);
        notificationService.notifyQuickSignal(task, signal, requesterId);
    }

    /** 퀵 시그널 초기화 */
    @Transactional
    public void clearQuickSignal(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setQuickSignal(null);
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
