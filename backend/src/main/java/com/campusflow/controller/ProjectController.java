package com.campusflow.controller;

import com.campusflow.entity.Project;
import com.campusflow.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * 0. 프로젝트 생성 (Postman 테스트용)
     * POST /api/projects
     */
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Map<String, String> request) {
        String title = request.get("title");
        String workspaceId = request.get("workspaceId");
        Project project = projectService.createProject(title, workspaceId);
        return ResponseEntity.ok(project);
    }

    /**
     * 1. 초대 코드로 프로젝트 입장하기
     * POST /api/projects/join?inviteCode=ABC12345&userId=user1
     */
    @PostMapping("/join")
    public ResponseEntity<String> joinProject(
            @RequestParam String inviteCode,
            @RequestParam String userId) {
        try {
            projectService.joinProjectByCode(inviteCode, userId);
            return ResponseEntity.ok("프로젝트 참여에 성공했습니다.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 2. 특정 프로젝트의 초대 정보 조회
     * GET /api/projects/{projectId}/invite-info
     */
    @GetMapping("/{projectId}/invite-info")
    public ResponseEntity<Project> getInviteInfo(@PathVariable Long projectId) {
        Project project = projectService.getProjectById(projectId);
        return ResponseEntity.ok(project);
    }
} // <--- 이 닫는 괄호가 아주 중요합니다!