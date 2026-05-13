package com.campusflow.repository;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import com.campusflow.entity.enums.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {

    // 1. 특정 유저가 속한 모든 워크스페이스 멤버 정보 조회
    // 유저 엔티티의 ID 필드명(userId)에 맞춰 명확하게 명명
    List<WorkspaceMember> findAllByUser_UserId(String userId);

    // 2. 특정 워크스페이스에 속한 모든 멤버 조회 (워크스페이스 관리 화면용)
    List<WorkspaceMember> findAllByWorkspace_WorkspaceId(String workspaceId);

    // 3. [추가] 특정 유저가 특정 워크스페이스에 이미 존재하는지 확인 (초대/가입 시 중복 체크)
    boolean existsByWorkspace_WorkspaceIdAndUser_UserId(String workspaceId, String userId);

    // 4. [추가] 특정 유저의 워크스페이스 내 역할 확인 (권한 체크용)
    Optional<WorkspaceMember> findByWorkspace_WorkspaceIdAndUser_UserId(String workspaceId, String userId);

    // 5. 워크스페이스 삭제 시 관련 멤버 데이터 일괄 삭제
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
}