package com.campusflow.service;

import com.campusflow.dto.ProjectProgressDto;
import com.campusflow.entity.Project;
import com.campusflow.entity.Task;
import com.campusflow.entity.User;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    /**
     * 1. 기존 칸반 보드 조회 로직
     */
    @Transactional(readOnly = true)
    public Map<TaskStatus, List<Task>> getKanbanBoard(String workspaceId) {
        List<Task> tasks = taskRepository.findAllByWorkspace_WorkspaceId(workspaceId);
        return tasks.stream().collect(Collectors.groupingBy(Task::getStatus));
    }

    /**
     * 2. 상태 변경 (대시보드 실시간 반영의 핵심)
     */
    @Transactional
    public void updateTaskStatus(String taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다. ID: " + taskId));
        task.setStatus(newStatus);
    }

    /**
     * 3. [추가] 대시보드 시각화용 데이터 가공 로직
     */
    @Transactional(readOnly = true)
    public ProjectProgressDto getProjectProgress(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));

        List<Task> tasks = taskRepository.findAllByProject_ProjectId(projectId);

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .count();

        // 진행률 계산 (0으로 나누기 방지)
        double progressRate = (totalTasks == 0) ? 0 : ((double) completedTasks / totalTasks) * 100;

        // 상태별 분포도 생성 (TODO: 2, DOING: 1...)
        Map<String, Long> distribution = tasks.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        return new ProjectProgressDto(
                project.getProjectId().toString(),
                project.getTitle(),
                Math.round(progressRate * 100) / 100.0, // 소수점 둘째자리까지
                totalTasks,
                completedTasks,
                distribution
        );
    }

    /**
     * 4. [추가] AI 장바구니에서 선택한 태스크를 프로젝트에 할당
     */
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