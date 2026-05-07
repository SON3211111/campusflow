package com.campusflow.repository;

import com.campusflow.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, String> {
    // 특정 유저가 소유한 워크스페이스 목록 조회 (owner 필드의 userId 기준)
    List<Workspace> findAllByOwner_UserId(String userId);
}