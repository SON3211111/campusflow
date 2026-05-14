package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.WorkspaceRequest;
import com.campusflow.dto.WorkspaceResponse;
import com.campusflow.entity.Notification;
import com.campusflow.entity.Workspace;
import com.campusflow.entity.User;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.TaskRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceMemberRepository;
import com.campusflow.repository.WorkspaceRepository;
import com.campusflow.service.WorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Workspace", description = "워크스페이스 관리 API")
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final NotificationRepository notificationRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;

    @Operation(summary = "내 워크스페이스 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<WorkspaceResponse>>> getMyWorkspaces(@RequestParam String userId) {
        // DB 설계에 맞춰 userId는 String입니다.
        List<Workspace> workspaces = workspaceService.findAllByUserId(userId);

        List<WorkspaceResponse> response = workspaces.stream()
                .map(WorkspaceResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", response));
    }

    @Operation(summary = "새 워크스페이스 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<WorkspaceResponse>> createWorkspace(
            @RequestParam String userId,
            @RequestBody WorkspaceRequest request) {

        // request.getType()은 Enum(WorkspaceType)으로 전달된다고 가정합니다.
        Workspace newWorkspace = workspaceService.createWorkspace(userId, request.getName(), request.getType(), request.getGradient());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(201, "워크스페이스 생성 성공", WorkspaceResponse.from(newWorkspace)));
    }

    @Operation(summary = "워크스페이스 수정")
    @PatchMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> updateWorkspace(
            @PathVariable String workspaceId,
            @RequestBody WorkspaceRequest request) {

        Workspace updated = workspaceService.updateWorkspace(workspaceId, request.getName(), request.getGradient());

        return ResponseEntity.ok(ApiResponse.success(200, "수정 성공", WorkspaceResponse.from(updated)));
    }

    @Operation(summary = "워크스페이스 삭제 (OWNER 전용)")
    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse<Void>> deleteWorkspace(
            @PathVariable String workspaceId,
            @RequestParam String userId) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));
        if (!workspace.getOwner().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(403, "워크스페이스 소유자만 삭제할 수 있습니다."));
        }
        workspaceService.deleteWorkspace(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "삭제 성공", null));
    }

    @Operation(summary = "워크스페이스 멤버 목록 조회")
    @GetMapping("/{workspaceId}/members")
    public ResponseEntity<ApiResponse<?>> getMembers(@PathVariable String workspaceId) {
        var members = workspaceService.getMembersByWorkspaceId(workspaceId);
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", members));
    }

    @Operation(summary = "멤버 내보내기 (OWNER 전용)")
    @DeleteMapping("/{workspaceId}/members/{userId}")
    public ResponseEntity<ApiResponse<?>> kickMember(
            @PathVariable String workspaceId,
            @PathVariable String userId) {
        workspaceMemberRepository.findByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId)
                .ifPresent(workspaceMemberRepository::delete);

        // 해당 유저가 배정된 태스크 assignee 초기화
        taskRepository.findAllByWorkspace_WorkspaceIdAndAssignee_UserId(workspaceId, userId)
                .forEach(task -> task.setAssignee(null));

        Notification noti = Notification.builder()
                .userId(userId)
                .message("추방되었습니다.")
                .build();
        notificationRepository.save(noti);
        return ResponseEntity.ok(ApiResponse.success(200, "내보내기 완료", null));
    }

    @Operation(summary = "워크스페이스 참여 (초대 코드/ID 입력)")
    @PostMapping("/{workspaceId}/join")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> joinWorkspace(
            @PathVariable String workspaceId,
            @RequestParam String userId) {
        var workspace = workspaceService.joinWorkspace(workspaceId, userId);
        return ResponseEntity.ok(ApiResponse.success(200, "참여 성공", WorkspaceResponse.from(workspace)));
    }

    @Operation(summary = "워크스페이스 참여 요청 (오너에게 알림 전송)")
    @PostMapping("/{workspaceId}/request-join")
    public ResponseEntity<ApiResponse<?>> requestJoin(
            @PathVariable String workspaceId,
            @RequestParam String userId) {

        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        // 자기 자신의 워크스페이스 참여 방지
        if (workspace.getOwner().getUserId().equals(userId)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "자신의 워크스페이스에는 참여할 수 없습니다."));
        }

        // 이미 멤버인지 체크
        if (workspaceMemberRepository.existsByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "이미 참여 중인 워크스페이스입니다."));
        }

        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // 오너에게 참여 요청 알림 전송
        String ownerId = workspace.getOwner().getUserId();
        String message = "JOIN_REQUEST|" + userId + "|" + requester.getName() + "|" + workspaceId + "|" + workspace.getName();

        Notification noti = Notification.builder()
                .userId(ownerId)
                .message(message)
                .build();
        notificationRepository.save(noti);

        return ResponseEntity.ok(ApiResponse.success(200, "참여 요청을 보냈습니다.", null));
    }

    @Operation(summary = "참여 요청 수락")
    @PostMapping("/join-requests/{notificationId}/accept")
    public ResponseEntity<ApiResponse<?>> acceptJoinRequest(@PathVariable String notificationId) {
        Notification noti = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));

        String[] parts = noti.getMessage().split("\\|");
        String requesterId = parts[1];
        String workspaceId = parts[3];

        workspaceService.joinWorkspace(workspaceId, requesterId);

        // 요청자에게 수락 알림
        Notification acceptNoti = Notification.builder()
                .userId(requesterId)
                .message("워크스페이스 참여 요청이 수락되었습니다.")
                .build();
        notificationRepository.save(acceptNoti);

        // 원래 알림 읽음 처리
        noti.setRead(true);
        notificationRepository.save(noti);

        return ResponseEntity.ok(ApiResponse.success(200, "참여 요청 수락 완료", null));
    }

    @Operation(summary = "참여 요청 거절")
    @PostMapping("/join-requests/{notificationId}/reject")
    public ResponseEntity<ApiResponse<?>> rejectJoinRequest(@PathVariable String notificationId) {
        Notification noti = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));

        String[] parts = noti.getMessage().split("\\|");
        String requesterId = parts[1];

        // 요청자에게 거절 알림
        Notification rejectNoti = Notification.builder()
                .userId(requesterId)
                .message("워크스페이스 참여 요청이 거절되었습니다.")
                .build();
        notificationRepository.save(rejectNoti);

        noti.setRead(true);
        notificationRepository.save(noti);

        return ResponseEntity.ok(ApiResponse.success(200, "참여 요청 거절 완료", null));
    }
}