package com.campusflow.service;

import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.TaskRepository;
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

    /**
     * 프로젝트별 모든 태스크를 가져와서 상태별(Enum)로 그룹화합니다.
     * 결과 예: { "TODO": [...], "DOING": [...], "DONE": [...] }
     */
    @Transactional(readOnly = true)
    public Map<TaskStatus, List<Task>> getKanbanBoard(Long projectId) {
        List<Task> tasks = taskRepository.findAllByProject_ProjectId(projectId);

        // 상태별로 그룹화하여 Map으로 반환
        return tasks.stream()
                .collect(Collectors.groupingBy(Task::getStatus));
    }

    /**
     * 특정 태스크의 상태를 업데이트합니다. (드래그 앤 드롭 대응)
     */
    @Transactional
    public void updateTaskStatus(Long taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("해당 태스크를 찾을 수 없습니다. ID: " + taskId));

        task.setStatus(newStatus);
        // 별도의 save 호출 없이도 @Transactional에 의해 변경 감지(Dirty Checking)로 저장됩니다.
    }
}