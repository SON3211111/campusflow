package com.campusflow.repository;

import com.campusflow.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, String> {
    List<Invitation> findByInvitee_UserIdAndStatus(String userId, String status);
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
}
