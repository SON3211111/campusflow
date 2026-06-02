package com.campusflow.repository;

import com.campusflow.entity.TeamCommunication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamCommunicationRepository extends JpaRepository<TeamCommunication, String> {

    // 태스크 댓글 조회
    List<TeamCommunication> findAllByTask_TaskIdOrderByCreatedAtAsc(String taskId);

    // 워크스페이스 채팅 — 채널별 최상위 메시지 (parent 없는 것)
    List<TeamCommunication> findAllByWorkspace_WorkspaceIdAndTaskIsNullAndChannelAndParentMessageIsNullOrderByCreatedAtAsc(String workspaceId, String channel);

    // 스레드 답글 조회
    List<TeamCommunication> findAllByParentMessage_MessageIdOrderByCreatedAtAsc(String parentMessageId);
}
