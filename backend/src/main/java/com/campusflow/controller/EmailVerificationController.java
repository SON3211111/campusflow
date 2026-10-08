package com.campusflow.controller;
import com.campusflow.dto.ApiResponse;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.EmailVerificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
@RequestMapping("/api/auth/email")
@RequiredArgsConstructor
public class EmailVerificationController {
    private final EmailVerificationService service;
    private final UserRepository users;
    public record SendRequest(@NotBlank @Email @Size(max=100) String email) {}
    public record VerifyRequest(@NotBlank @Email @Size(max=100) String email, @NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    @PostMapping("/send")
    public ResponseEntity<?> send(@Valid @RequestBody SendRequest request) {
        String email = EmailVerificationService.normalize(request.email());
        if (users.existsByEmail(email)) return ResponseEntity.status(409).body(ApiResponse.error(409,"이미 가입된 이메일입니다."));
        try { service.send(email); }
        catch (MailException e) { return ResponseEntity.status(503).body(ApiResponse.error(503,"메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.")); }
        return ResponseEntity.ok(ApiResponse.success(200,"인증번호를 보냈습니다. 10분 안에 입력하세요."));
    }
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody VerifyRequest request) {
        String token = service.verify(request.email(),request.code());
        if (token == null) return ResponseEntity.badRequest().body(ApiResponse.error(400,"인증번호가 틀렸거나 만료되었습니다. 5회 실패 시 다시 발송해 주세요."));
        return ResponseEntity.ok(ApiResponse.success(200,"인증 완료",Map.of("verificationToken",token)));
    }
}
