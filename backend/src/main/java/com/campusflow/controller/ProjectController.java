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

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Map<String, String> request) {
        String title = request.get("title");
        String workspaceId = request.get("workspaceId");
        Project project = projectService.createProject(title, workspaceId);
        return ResponseEntity.ok(project);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getProjectById(projectId));
    }

    @PostMapping("/join")
    public ResponseEntity<Void> joinByCode(@RequestBody Map<String, String> request) {
        String inviteCode = request.get("inviteCode");
        String userId = request.get("userId");
        projectService.joinProjectByCode(inviteCode, userId);
        return ResponseEntity.ok().build();
    }
}
