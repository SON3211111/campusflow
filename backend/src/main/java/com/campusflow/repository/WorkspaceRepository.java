package com.campusflow.repository;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.enums.WorkspaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, String> {

    // 1. 특정 유저가 '소유(Owner)'한 워크스페이스 목록 조회
    List<Workspace> findAllByOwner_UserId(String userId);

    // 2. [추가] 특정 유저가 소유한 특정 타입의 워크스페이스 찾기
    // 예: "이 유저의 PERSONAL 워크스페이스가 이미 있는가?" 확인할 때 사용
    Optional<Workspace> findByOwner_UserIdAndType(String userId, WorkspaceType type);

    // 3. [추가] 워크스페이스 이름 중복 체크 (선택 사항)
    boolean existsByNameAndOwner_UserId(String name, String userId);

    // 4. [추가] 워크스페이스 ID로 상세 정보 조회 (FetchJoin 등이 필요할 때 확장 가능)
    Optional<Workspace> findByWorkspaceId(String workspaceId);
}