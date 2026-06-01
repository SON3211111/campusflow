package com.campusflow.repository;

import com.campusflow.entity.TeamCommunication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamCommunicationRepository extends JpaRepository<TeamCommunication, String> {

    // 태스크 댓글 조회 (task_id IS NOT NULL)
    List<TeamCommunication> findAllByTask_TaskIdOrderByCreatedAtAsc(String taskId);

    // 워크스페이스 채팅 조회 (task_id IS NULL)
    List<TeamCommunication> findAllByWorkspace_WorkspaceIdAndTaskIsNullOrderByCreatedAtAsc(String workspaceId);
}
