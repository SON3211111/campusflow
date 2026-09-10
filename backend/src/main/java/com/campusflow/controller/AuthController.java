package com.campusflow.controller;

import com.campusflow.config.TokenProvider;
import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.LoginRequest; // [수정] Map 대신 DTO 권장
import com.campusflow.dto.SignupRequest; // [수정] Entity 대신 DTO 권장
import com.campusflow.entity.User;
import com.campusflow.entity.enums.UserStatus; // [추가] Enum 관리
import com.campusflow.repository.UserRepository;
import com.campusflow.service.WorkspaceService;
import com.campusflow.service.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final WorkspaceService workspaceService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/email/send")
    public ResponseEntity<ApiResponse<?>> sendVerificationCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body(ApiResponse.error(400, "이메일을 입력해주세요."));
        if (userRepository.existsByEmail(email)) return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(409, "이미 존재하는 이메일입니다."));
        try { emailVerificationService.send(email); return ResponseEntity.ok(ApiResponse.success(200, "인증 코드를 발송했습니다.")); }
        catch (Exception e) { return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.error(503, "이메일 발송에 실패했습니다.")); }
    }

    @PostMapping("/email/verify")
    public ResponseEntity<ApiResponse<?>> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email"), code = body.get("code");
        if (email == null || code == null || !code.matches("\\d{6}")) return ResponseEntity.badRequest().body(ApiResponse.error(400, "6자리 인증 코드를 입력해주세요."));
        return emailVerificationService.verify(email, code) ? ResponseEntity.ok(ApiResponse.success(200, "이메일 인증이 완료되었습니다.")) : ResponseEntity.badRequest().body(ApiResponse.error(400, "인증 코드가 올바르지 않거나 만료되었습니다."));
    }

    // 1-1. 회원가입 (워크스페이스 자동 생성 로직 포함)
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<?>> signup(@Valid @RequestBody SignupRequest signupRequest) {
        if (!emailVerificationService.isVerified(signupRequest.getEmail())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(403, "이메일 인증이 필요합니다."));
        // 1. 이메일 중복 체크
        if (userRepository.findByEmail(signupRequest.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(409, "이미 존재하는 이메일입니다."));
        }

        // 2. [수정] DTO -> Entity 변환 및 초기 설정
        User user = User.builder()
                .userId(java.util.UUID.randomUUID().toString()) // ID 생성 방식에 따라 조정
                .name(signupRequest.getName())
                .email(signupRequest.getEmail())
                .password(passwordEncoder.encode(signupRequest.getPassword()))
                .role(signupRequest.getRole()) // DBML의 user_role_enum 매핑
                .status(UserStatus.ACTIVE)    // 기본값 ACTIVE 명시
                .build();

        User savedUser = userRepository.save(user);

        // 3. 개인 워크스페이스 자동 생성
        workspaceService.createDefaultPersonalWorkspace(savedUser);
        emailVerificationService.consume(savedUser.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(201, "회원가입 및 개인 워크스페이스 생성 성공", null)); // 유저 비번 등 노출 방지를 위해 null 또는 전용 DTO
    }

    // 1-1-1. 이메일로 유저 검색
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<?>> searchByEmail(@RequestParam String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(404, "계정을 찾을 수 없습니다."));
        }
        User user = userOpt.get();
        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getUserId());
        data.put("name", user.getName());
        data.put("email", user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", data));
    }

    // 1-2. 로그인
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(@RequestBody LoginRequest loginRequest) {
        // 1. 이메일로 유저 찾기
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(404, "존재하지 않는 계정입니다."));
        }

        User user = userOptional.get();

        // 2. 계정 상태 확인 (DB 설계 반영)
        if (user.getStatus() == UserStatus.INACTIVE) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(403, "비활성화된 계정입니다."));
        }

        // 3. 비밀번호 일치 여부 확인
        if (user.getPassword() != null && passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {

            // 마지막 로그인 시간 업데이트 로직 추가 가능 (DB 설계의 last_login_at 반영)
            // userService.updateLastLogin(user.getUserId());

            String token = tokenProvider.createToken(user.getEmail(), user.getRole());

            Map<String, Object> data = new HashMap<>();
            data.put("accessToken", token);
            data.put("userId", user.getUserId());
            data.put("name", user.getName());
            data.put("role", user.getRole()); // Enum 타입 전달

            return ResponseEntity.ok(ApiResponse.success(200, "로그인 성공", data));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(401, "비밀번호가 일치하지 않습니다."));
    }
}
