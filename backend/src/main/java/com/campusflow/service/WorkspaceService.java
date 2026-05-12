package com.campusflow.service;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
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

    @Transactional
    public void createDefaultPersonalWorkspace(User user) {
        Workspace workspace = new Workspace();
        workspace.setName(user.getName() + "의 워크스페이스");
        workspace.setType("PERSONAL");
        workspace.setOwner(user);
        workspaceRepository.save(workspace);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(workspace);
        member.setUser(user);
        member.setRole("OWNER");
        workspaceMemberRepository.save(member);
    }

    // WorkspaceMember 기반으로 내가 속한 모든 워크스페이스 반환
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
        return workspaceRepository.save(workspace);
    }

    @Transactional
    public void deleteWorkspace(String workspaceId) {
        workspaceMemberRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional
    public Workspace createWorkspace(String userId, String name, String type) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        Workspace workspace = new Workspace();
        workspace.setName(name);
        workspace.setType(type != null ? type : "TEAM");
        workspace.setOwner(owner);
        Workspace saved = workspaceRepository.save(workspace);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(saved);
        member.setUser(owner);
        member.setRole("OWNER");
        workspaceMemberRepository.save(member);

        return saved;
    }
}
