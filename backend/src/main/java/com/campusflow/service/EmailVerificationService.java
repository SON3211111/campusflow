package com.campusflow.service;

import com.campusflow.entity.EmailVerification;
import com.campusflow.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final EmailVerificationRepository repository;
    private final JavaMailSender mailSender;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public void send(String email) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        repository.save(new EmailVerification(email, passwordEncoder.encode(code), LocalDateTime.now().plusMinutes(10)));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Campusflow 이메일 인증 코드");
        message.setText("인증 코드: " + code + "\n10분 안에 입력해주세요.");
        mailSender.send(message);
    }

    public boolean verify(String email, String code) {
        return repository.findById(email)
                .filter(item -> item.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(item -> passwordEncoder.matches(code, item.getCodeHash()))
                .map(item -> { item.verify(); repository.save(item); return true; })
                .orElse(false);
    }

    public boolean isVerified(String email) {
        return repository.findById(email).filter(item -> item.isVerified() && item.getExpiresAt().isAfter(LocalDateTime.now())).isPresent();
    }

    public void consume(String email) { repository.deleteById(email); }
}
