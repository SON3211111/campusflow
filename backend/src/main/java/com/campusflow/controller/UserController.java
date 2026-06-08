package com.campusflow.controller;

import com.campusflow.dto.PasswordChangeRequest;
import com.campusflow.dto.ProfileUpdateRequest;
import com.campusflow.dto.WithdrawRequest;
import com.campusflow.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private final UserService userService;

    /**
     * A. 이름 수정 API
     * PUT /api/users/profile/{userId}
     */
    @PutMapping("/profile/{userId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        userService.updateProfile(userId, request);
        return ResponseEntity.ok().body("{\"message\": \"이름이 성공적으로 변경되었습니다.\"}");
    }

    /**
     * B. 비밀번호 변경 API
     * PUT /api/users/profile/{userId}/password
     */
    @PutMapping("/profile/{userId}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable String userId,
            @RequestBody PasswordChangeRequest request) {
        try {
            userService.changePassword(userId, request);
            return ResponseEntity.ok().body("{\"message\": \"비밀번호가 안전하게 변경되었습니다.\"}");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * C. 회원 탈퇴 API
     * POST /api/users/profile/{userId}/withdraw
     */
    @PostMapping("/profile/{userId}/withdraw")
    public ResponseEntity<?> withdrawAccount(
            @PathVariable String userId,
            @RequestBody WithdrawRequest request) {
        try {
            userService.withdrawAccount(userId, request);
            return ResponseEntity.ok().body("{\"message\": \"회원 탈퇴 처리가 완료되었습니다.\"}");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }
}