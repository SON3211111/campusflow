package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.Task;
import com.campusflow.entity.enums.TaskStatus;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional
    public void notifyStatusChange(Task task, TaskStatus prevStatus, TaskStatus newStatus, String changedByUserId) {
        if (task.getWorkspace() == null) return;

        String taskTitle = task.getTitle();
        String changedByName = (task.getWorkspace() != null && changedByUserId != null)
                ? resolveUserName(task.getWorkspace().getWorkspaceId(), changedByUserId)
                : "누군가";

        String message = buildMessage(changedByName, taskTitle, newStatus);

        List<String> memberIds = workspaceMemberRepository
                .findAllByWorkspace_WorkspaceId(task.getWorkspace().getWorkspaceId())
                .stream()
                .map(m -> m.getUser().getUserId())
                .filter(uid -> !uid.equals(changedByUserId))
                .toList();

        for (String userId : memberIds) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .message(message)
                    .type("STATUS_CHANGE")
                    .taskId(task.getTaskId())
                    .build());
        }
    }

    private String buildMessage(String userName, String taskTitle, TaskStatus newStatus) {
        return switch (newStatus) {
            case DONE   -> userName + "이(가) [" + taskTitle + "]을(를) 완료했습니다 🎉";
            case DOING  -> userName + "이(가) [" + taskTitle + "]을(를) 진행 중으로 변경했습니다";
            case ISSUE  -> userName + "이(가) [" + taskTitle + "]을(를) 보류 처리했습니다";
            case REVIEW -> userName + "이(가) [" + taskTitle + "]을(를) 검토 중으로 변경했습니다";
            default     -> userName + "이(가) [" + taskTitle + "] 상태를 변경했습니다";
        };
    }

    @Transactional
    public void notifyQuickSignal(Task task, String signal, String requesterId) {
        if (task.getWorkspace() == null) return;

        String requesterName = resolveUserName(task.getWorkspace().getWorkspaceId(), requesterId);
        String signalLabel = "HELP_NEEDED".equals(signal) ? "도움을 요청" : "피드백을 요청";
        String message = requesterName + "이(가) [" + task.getTitle() + "]에서 " + signalLabel + "했습니다 🆘";

        List<String> memberIds = workspaceMemberRepository
                .findAllByWorkspace_WorkspaceId(task.getWorkspace().getWorkspaceId())
                .stream()
                .map(m -> m.getUser().getUserId())
                .filter(uid -> !uid.equals(requesterId))
                .toList();

        for (String userId : memberIds) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .message(message)
                    .type("QUICK_SIGNAL")
                    .taskId(task.getTaskId())
                    .build());
        }
    }

    private String resolveUserName(String workspaceId, String userId) {
        return workspaceMemberRepository
                .findByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId)
                .map(m -> m.getUser().getName())
                .orElse("팀원");
    }
}
