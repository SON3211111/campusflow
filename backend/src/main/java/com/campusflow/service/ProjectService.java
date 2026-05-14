package com.campusflow.service;

import com.campusflow.entity.Project;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.util.InviteCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    /**
     * 프로젝트 생성 (초대 코드 자동 부여)
     */
    @Transactional
    public Project createProject(String title, String workspaceId) {
        Project project = Project.builder() // 빌더 패턴 사용 추천 (엔티티에 @Builder 있을 경우)
                .title(title)
                .inviteCode(InviteCodeGenerator.generateCode())
                .inviteExpiry(InviteCodeGenerator.calculateExpiry(7))
                .isInviteActive(true)
                .build();

        return projectRepository.save(project);
    }

    /**
     * [추가] ID로 프로젝트 단건 조회
     */
    @Transactional(readOnly = true)
    public Project getProjectById(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다."));
    }

    /**
     * [추가] 초대 코드로 프로젝트 입장 로직
     */
    @Transactional
    public void joinProjectByCode(String inviteCode, String userId) {
        // 1. 코드로 프로젝트 존재 여부 확인
        Project project = projectRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대 코드입니다."));

        // 2. 초대 코드 활성화 및 만료 여부 검증
        if (!project.getIsInviteActive()) {
            throw new IllegalStateException("현재 비활성화된 초대 코드입니다.");
        }

        if (project.getInviteExpiry() != null && project.getInviteExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("초대 코드의 유효 기간이 만료되었습니다.");
        }

        // 3. 사용자 참여 처리 로직 (이곳에 멤버 테이블 추가 등을 작성)
        // 예: memberRepository.save(new ProjectMember(project, user));
        System.out.println("사용자 " + userId + "님이 프로젝트 " + project.getTitle() + "에 입장했습니다.");
    }
}