package com.campusflow.controller;

import com.campusflow.config.TokenProvider;
import com.campusflow.dto.ApiResponse;
import com.campusflow.entity.User;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.WorkspaceService; // 신규 추가될 서비스
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final WorkspaceService workspaceService; // [추가] 의존성 주입

    // 1-1. 회원가입 (워크스페이스 자동 생성 로직 포함)
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<?>> signup(@RequestBody User userRequest) {
        // 이메일 중복 체크
        if (userRepository.findByEmail(userRequest.getEmail()).isPresent()) {
            return ResponseEntity.status(409).body(ApiResponse.error(409, "이미 존재하는 이메일입니다."));
        }

        // 1. 비밀번호 암호화 후 유저 저장
        userRequest.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        User savedUser = userRepository.save(userRequest);

        // 2. [핵심] 가입된 유저를 위한 개인 워크스페이스 자동 생성
        // 이 메서드는 내부적으로 Workspace 저장 및 WorkspaceMember(OWNER) 저장을 수행합니다.
        workspaceService.createDefaultPersonalWorkspace(savedUser);

        return ResponseEntity.status(201).body(ApiResponse.success(201, "회원가입 및 개인 워크스페이스 생성 성공", savedUser));
    }

    // 1-2. 로그인 (기존 기능 유지)
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        // 1. 이메일로 유저 찾기
        Optional<User> userOptional = userRepository.findByEmail(email);

        // 2. 계정이 없는 경우
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error(404, "존재하지 않는 계정입니다."));
        }

        User user = userOptional.get();

        // 3. 비밀번호 일치 여부 확인
        if (passwordEncoder.matches(password, user.getPassword())) {

            // JWT 토큰 생성
            String token = tokenProvider.createToken(user.getEmail(), user.getRole());

            Map<String, Object> data = new HashMap<>();
            data.put("accessToken", token);
            data.put("userId", user.getUserId());
            data.put("name", user.getName());
            data.put("role", user.getRole());

            return ResponseEntity.ok(ApiResponse.success(200, "로그인 성공", data));
        }

        // 4. 비밀번호가 틀린 경우
        return ResponseEntity.status(401).body(ApiResponse.error(401, "비밀번호가 일치하지 않습니다."));
    }
}