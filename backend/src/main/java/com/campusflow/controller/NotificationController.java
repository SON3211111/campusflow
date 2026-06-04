package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.entity.Notification;
import com.campusflow.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getNotifications(
            @RequestParam String userId,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        List<Notification> list = unreadOnly
                ? notificationRepository.findByUserIdAndReadFalse(userId)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Map<String, Object>> result = list.stream().map(n -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("notificationId", n.getNotificationId());
            m.put("message", n.getMessage());
            m.put("type", n.getType());
            m.put("taskId", n.getTaskId());
            m.put("read", n.isRead());
            m.put("createdAt", n.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", result));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<?>> markRead(@PathVariable String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok(ApiResponse.success(200, "읽음 처리", null));
    }
}
