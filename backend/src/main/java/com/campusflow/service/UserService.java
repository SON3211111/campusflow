package com.campusflow.service;

import com.campusflow.dto.PasswordChangeRequest;
import com.campusflow.dto.ProfileUpdateRequest;
import com.campusflow.dto.WithdrawRequest;
import com.campusflow.entity.User;
import com.campusflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    /**
     * 1. 기본 프로필 이름 변경
     */
    public void updateProfile(String userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다. ID: " + userId));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }
    }

    /**
     * 2. 보안 - 비밀번호 변경
     */
    public void changePassword(String userId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다. ID: " + userId));

        // 현재 비밀번호 일치 여부 검증
        if (!user.getPassword().equals(request.getCurrent())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        // 새 비밀번호 길이 검증
        if (request.getNext() == null || request.getNext().length() < 6) {
            throw new IllegalArgumentException("새 비밀번호는 6자 이상이어야 합니다.");
        }

        // 새 비밀번호 확인 일치 검증
        if (!request.getNext().equals(request.getConfirm())) {
            throw new IllegalArgumentException("새 비밀번호가 일치하지 않습니다.");
        }

        user.setPassword(request.getNext());
    }

    /**
     * 3. 계정 관리 - 회원 탈퇴 (DB 완전 삭제 방식)
     * 💡 문제의 원인이었던 UserStatus 지정을 지우고, 깔끔하게 레포지토리로 유저를 DB에서 바로 지웁니다.
     */
    public void withdrawAccount(String userId, WithdrawRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다. ID: " + userId));

        // 탈퇴 전 비밀번호 최종 확인
        if (!user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }

        // 데이터베이스에서 해당 유저 데이터 깔끔하게 삭제
        userRepository.delete(user);
    }
}