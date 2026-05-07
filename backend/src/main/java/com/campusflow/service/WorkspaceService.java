package com.campusflow.service;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

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

    public List<Workspace> findAllByUserId(String userId) {
        return workspaceRepository.findAllByOwner_UserId(userId);
    }

    @Transactional
    public Workspace createTeamWorkspace(String userId, String name) {
        Workspace workspace = new Workspace();
        workspace.setName(name);
        workspace.setType("TEAM");
        return workspaceRepository.save(workspace);
    }
}