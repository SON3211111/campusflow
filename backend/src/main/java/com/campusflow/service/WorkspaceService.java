package com.campusflow.service;

import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.WorkspaceMember;
import com.campusflow.entity.enums.WorkspaceRole;
import com.campusflow.entity.enums.WorkspaceType;
import com.campusflow.repository.ContributionMetricsRepository;
import com.campusflow.repository.InvitationRepository;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.TaskRepository;
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
    private final TaskRepository taskRepository;
    private final InvitationRepository invitationRepository;
    private final ProjectRepository projectRepository;
    private final ContributionMetricsRepository contributionMetricsRepository;

    /** 회원가입 시 개인 워크스페이스 자동 생성 */
    @Transactional
    public void createDefaultPersonalWorkspace(User user) {
        createWorkspaceInternal(user, user.getName() + "의 워크스페이스", WorkspaceType.PERSONAL);
    }

    /** 새 워크스페이스 생성 (API용) */
    @Transactional
    public Workspace createWorkspace(String userId, String name, WorkspaceType type, String gradient) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        WorkspaceType wsType = (type != null) ? type : WorkspaceType.TEAM;
        return createWorkspaceInternal(owner, name, wsType, gradient);
    }

    private Workspace createWorkspaceInternal(User owner, String name, WorkspaceType type) {
        return createWorkspaceInternal(owner, name, type, null);
    }

    private Workspace createWorkspaceInternal(User owner, String name, WorkspaceType type, String gradient) {
        Workspace workspace = Workspace.builder()
                .name(name)
                .type(type)
                .owner(owner)
                .gradient(gradient)
                .build();
        workspaceRepository.save(workspace);

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
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
        if (newName != null && !newName.isBlank()) workspace.setName(newName);
        if (newGradient != null && !newGradient.isBlank()) workspace.setGradient(newGradient);
        return workspace;
    }

    @Transactional(readOnly = true)
    public Workspace getWorkspace(String workspaceId) {
        return workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
    }

    @Transactional
    public Workspace updateCustomColumns(String workspaceId, List<String> columns) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
        workspace.setCustomColumns(columns == null || columns.isEmpty() ? null : String.join(",", columns));
        return workspace;
    }

    @Transactional
    public void deleteWorkspace(String workspaceId) {
        // FK 제약 순서:
        // 1. Task의 project FK 제거 (null로 설정)
        // 2. Task 삭제
        // 3. ContributionMetrics 삭제
        // 4. Project 삭제
        // 5. Invitation 삭제
        // 6. WorkspaceMember 삭제
        // 7. Workspace 삭제

        // Task의 project_id, parent_id를 null로 설정 (FK 제약 제거)
        taskRepository.updateProjectNullByWorkspace(workspaceId);
        taskRepository.updateParentTaskNullByWorkspace(workspaceId);

        taskRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        contributionMetricsRepository.deleteAllByProject_Workspace_WorkspaceId(workspaceId);
        projectRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        invitationRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        workspaceMemberRepository.deleteAllByWorkspace_WorkspaceId(workspaceId);
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, String>> getMembersByWorkspaceId(String workspaceId) {
        return workspaceMemberRepository.findAllByWorkspace_WorkspaceId(workspaceId)
                .stream()
                .map(m -> {
                    java.util.Map<String, String> map = new java.util.HashMap<>();
                    map.put("userId", m.getUser().getUserId());
                    map.put("name", m.getUser().getName());
                    map.put("email", m.getUser().getEmail());
                    map.put("role", m.getRole().name());
                    return map;
                })
                .collect(Collectors.toList());
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
            if (workspace.getType() == WorkspaceType.PERSONAL) {
                workspace.setType(WorkspaceType.TEAM);
            }
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
