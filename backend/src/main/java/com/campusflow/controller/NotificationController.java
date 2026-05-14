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
    public ResponseEntity<ApiResponse<?>> getUnread(@RequestParam String userId) {
        List<Notification> list = notificationRepository.findByUserIdAndReadFalse(userId);
        List<Map<String, Object>> result = list.stream().map(n -> Map.of(
                "notificationId", (Object) n.getNotificationId(),
                "message", n.getMessage()
        )).collect(Collectors.toList());
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
