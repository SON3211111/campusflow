package com.campusflow.repository;

import com.campusflow.entity.Channel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChannelRepository extends JpaRepository<Channel, String> {
    List<Channel> findAllByWorkspace_WorkspaceIdOrderByCreatedAtAsc(String workspaceId);
    boolean existsByWorkspace_WorkspaceIdAndName(String workspaceId, String name);
}
