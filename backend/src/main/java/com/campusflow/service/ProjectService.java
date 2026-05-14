package com.campusflow.service;

import com.campusflow.entity.Project;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import com.campusflow.entity.enums.WorkspaceRole;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.util.InviteCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional
    public Project createProject(String title, String workspaceId) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
        Project project = Project.builder()
                .title(title)
                .workspace(workspace)
                .inviteCode(InviteCodeGenerator.generateCode())
                .inviteExpiry(InviteCodeGenerator.calculateExpiry(7))
                .isInviteActive(true)
                .build();
        return projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public Project getProjectById(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다."));
    }

    @Transactional
    public void joinProjectByCode(String inviteCode, String userId) {
        Project project = projectRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대 코드입니다."));

        if (!project.getIsInviteActive()) {
            throw new IllegalStateException("비활성화된 초대 코드입니다.");
        }
        if (project.getInviteExpiry() != null && project.getInviteExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("초대 코드의 유효 기간이 만료되었습니다.");
        }

        Workspace workspace = project.getWorkspace();
        if (workspace == null) {
            throw new IllegalStateException("프로젝트에 연결된 워크스페이스가 없습니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        boolean alreadyMember = workspaceMemberRepository
                .existsByWorkspace_WorkspaceIdAndUser_UserId(workspace.getWorkspaceId(), userId);
        if (alreadyMember) {
            throw new IllegalStateException("이미 참여 중인 워크스페이스입니다.");
        }

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(WorkspaceRole.MEMBER)
                .build();
        workspaceMemberRepository.save(member);
    }
}
