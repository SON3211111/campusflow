package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.entity.User;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<?>> getUser(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", toResponse(user)));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<ApiResponse<?>> updateUser(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        String name = request.get("name");
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        if (newPassword != null && !newPassword.isBlank()) {
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(401, "현재 비밀번호가 일치하지 않습니다."));
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(200, "수정 성공", toResponse(saved)));
    }

    private Map<String, Object> toResponse(User user) {
        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getUserId());
        data.put("name", user.getName());
        data.put("email", user.getEmail());
        data.put("role", user.getRole());
        data.put("status", user.getStatus());
        data.put("createdAt", getCreatedAtFallback(user));
        return data;
    }

    private LocalDateTime getCreatedAtFallback(User user) {
        if (user.getCreatedAt() != null) {
            return user.getCreatedAt();
        }

        return workspaceRepository.findAllByOwner_UserId(user.getUserId())
                .stream()
                .map(workspace -> workspace.getCreatedAt())
                .filter(createdAt -> createdAt != null)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }
}
