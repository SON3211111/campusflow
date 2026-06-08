package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.entity.Invitation;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.repository.InvitationRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceService workspaceService;

    // 초대 보내기
    @PostMapping
    public ResponseEntity<ApiResponse<?>> sendInvitation(
            @RequestParam String inviterId,
            @RequestParam String inviteeId,
            @RequestParam String workspaceId) {

        User inviter = userRepository.findById(inviterId)
                .orElseThrow(() -> new IllegalArgumentException("초대자를 찾을 수 없습니다."));
        User invitee = userRepository.findById(inviteeId)
                .orElseThrow(() -> new IllegalArgumentException("초대받을 유저를 찾을 수 없습니다."));
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));

        Invitation invitation = Invitation.builder()
                .workspace(workspace)
                .inviter(inviter)
                .invitee(invitee)
                .status("PENDING")
                .build();

        invitationRepository.save(invitation);
        return ResponseEntity.ok(ApiResponse.success(200, "초대 전송 완료", null));
    }

    // 내 초대 목록 조회 (PENDING)
    @GetMapping
    public ResponseEntity<ApiResponse<?>> getMyInvitations(@RequestParam String userId) {
        List<Invitation> invitations = invitationRepository.findByInvitee_UserIdAndStatus(userId, "PENDING");
        List<Map<String, Object>> result = invitations.stream().map(inv -> Map.of(
                "invitationId", (Object) inv.getInvitationId(),
                "workspaceId", inv.getWorkspace().getWorkspaceId(),
                "workspaceName", inv.getWorkspace().getName(),
                "inviterName", inv.getInviter().getName()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", result));
    }

    // 수락
    @PostMapping("/{invitationId}/accept")
    public ResponseEntity<ApiResponse<?>> accept(@PathVariable String invitationId) {
        Invitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("초대를 찾을 수 없습니다."));

        workspaceService.joinWorkspace(inv.getWorkspace().getWorkspaceId(), inv.getInvitee().getUserId());

        inv.setStatus("ACCEPTED");
        invitationRepository.save(inv);
        return ResponseEntity.ok(ApiResponse.success(200, "수락 완료", null));
    }

    // 거절
    @PostMapping("/{invitationId}/reject")
    public ResponseEntity<ApiResponse<?>> reject(@PathVariable String invitationId) {
        Invitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("초대를 찾을 수 없습니다."));
        inv.setStatus("REJECTED");
        invitationRepository.save(inv);
        return ResponseEntity.ok(ApiResponse.success(200, "거절 완료", null));
    }
}
