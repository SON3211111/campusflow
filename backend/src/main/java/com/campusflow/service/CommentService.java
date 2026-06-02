package com.campusflow.service;

import com.campusflow.dto.CommentResponse;
import com.campusflow.entity.Notification;
import com.campusflow.entity.Task;
import com.campusflow.entity.TeamCommunication;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.TeamCommunicationRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final TeamCommunicationRepository communicationRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final NotificationRepository notificationRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String taskId) {
        return communicationRepository.findAllByTask_TaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getWorkspaceMessages(String workspaceId, String channel) {
        String ch = (channel != null && !channel.isBlank()) ? channel : "일반";
        return communicationRepository
                .findAllByWorkspace_WorkspaceIdAndTaskIsNullAndChannelAndParentMessageIsNullOrderByCreatedAtAsc(workspaceId, ch)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getReplies(String parentMessageId) {
        return communicationRepository.findAllByParentMessage_MessageIdOrderByCreatedAtAsc(parentMessageId)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentResponse sendWorkspaceMessage(String workspaceId, String senderId, String content,
                                                String channel, String mentionList, String parentMessageId) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        TeamCommunication parent = null;
        if (parentMessageId != null && !parentMessageId.isBlank()) {
            parent = communicationRepository.findById(parentMessageId).orElse(null);
        }

        TeamCommunication msg = TeamCommunication.builder()
                .workspace(workspace)
                .task(null)
                .sender(sender)
                .content(content)
                .channel(channel != null ? channel : "일반")
                .mentionList(mentionList)
                .parentMessage(parent)
                .build();

        TeamCommunication saved = communicationRepository.save(msg);

        // 멘션 알림
        if (mentionList != null && !mentionList.isBlank() && !mentionList.equals("[]")) {
            String cleanList = mentionList.replaceAll("[\\[\\]\"\\s]", "");
            for (String uid : cleanList.split(",")) {
                if (!uid.isBlank() && !uid.equals(senderId)) {
                    notificationRepository.save(com.campusflow.entity.Notification.builder()
                            .userId(uid)
                            .message(sender.getName() + "이(가) 채팅에서 회원님을 멘션했습니다: " + content)
                            .type("MENTION")
                            .taskId(null)
                            .build());
                }
            }
        }

        return CommentResponse.from(saved);
    }

    @Transactional
    public CommentResponse updateMessage(String messageId, String content) {
        TeamCommunication msg = communicationRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("메시지를 찾을 수 없습니다."));
        msg.setContent(content);
        return CommentResponse.from(communicationRepository.save(msg));
    }

    @Transactional
    public void deleteMessage(String messageId) {
        communicationRepository.deleteById(messageId);
    }

    @Transactional
    public CommentResponse addComment(String workspaceId, String taskId, String senderId, String content) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("태스크를 찾을 수 없습니다."));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        TeamCommunication comment = TeamCommunication.builder()
                .workspace(workspace)
                .task(task)
                .sender(sender)
                .content(content)
                .build();

        TeamCommunication saved = communicationRepository.save(comment);

        // 담당자에게 알림 (본인 댓글 제외)
        if (task.getAssignee() != null && !task.getAssignee().getUserId().equals(senderId)) {
            notificationRepository.save(Notification.builder()
                    .userId(task.getAssignee().getUserId())
                    .message(sender.getName() + "이(가) [" + task.getTitle() + "]에 댓글을 달았습니다.")
                    .type("COMMENT")
                    .taskId(taskId)
                    .build());
        }

        return CommentResponse.from(saved);
    }
}
