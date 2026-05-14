package com.campusflow.service;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import com.campusflow.entity.enums.WorkspaceRole;
import com.campusflow.entity.enums.WorkspaceType;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    /**
     * 회원가입 시 호출되는 개인 워크스페이스 자동 생성
     */
    @Transactional
    public void createDefaultPersonalWorkspace(User user) {
        // [수정] Builder와 Enum 사용
        createWorkspaceInternal(user, user.getName() + "의 워크스페이스", WorkspaceType.PERSONAL);
    }

    /**
     * 새로운 워크스페이스 생성 (API용)
     */
    @Transactional
    public Workspace createWorkspace(String userId, String name, WorkspaceType type) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // [수정] String 대신 WorkspaceType Enum 사용
        WorkspaceType wsType = (type != null) ? type : WorkspaceType.TEAM;
        return createWorkspaceInternal(owner, name, wsType);
    }

    /**
     * 내부 공통 생성 로직 (워크스페이스 생성 + 멤버 등록)
     */
    private Workspace createWorkspaceInternal(User owner, String name, WorkspaceType type) {
        // 1. 워크스페이스 생성
        Workspace workspace = Workspace.builder()
                .name(name)
                .type(type)
                .owner(owner)
                .build();
        workspaceRepository.save(workspace);

        // 2. 소유자를 멤버(OWNER 역할)로 등록
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(owner)
                .role(WorkspaceRole.OWNER)
                .build();
        workspaceMemberRepository.save(member);

        return workspace;
    }

    @Transactional(readOnly = true)
    public List<Workspace> findAllByUserId(String userId) {
        return workspaceMemberRepository.findAllByUser_UserId(userId)
                .stream()
                .map(WorkspaceMember::getWorkspace)
                .collect(Collectors.toList());
    }

    @Transactional
    public Workspace updateWorkspace(String workspaceId, String newName, String newGradient) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        if (newName != null && !newName.isBlank()) workspace.setName(newName);
        if (newGradient != null && !newGradient.isBlank()) workspace.setGradient(newGradient);

        return workspace; // @Transactional이 있어서 save() 명시 호출 안 해도 변경 감지(Dirty Check)로 저장됨
    }

    @Transactional
    public void deleteWorkspace(String workspaceId) {
        workspaceMemberRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional
    public Workspace joinWorkspace(String workspaceId, String userId) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        boolean alreadyMember = workspaceMemberRepository
                .existsByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId);
        if (!alreadyMember) {
            WorkspaceMember member = WorkspaceMember.builder()
                    .workspace(workspace)
                    .user(user)
                    .role(WorkspaceRole.MEMBER)
                    .build();
            workspaceMemberRepository.save(member);
        }
        return workspace;
    }
}