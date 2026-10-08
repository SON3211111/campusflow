package com.campusflow.service;
import com.campusflow.entity.EmailVerification;
import com.campusflow.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final EmailVerificationRepository repository;
    private final JavaMailSender mailSender;
    private final BCryptPasswordEncoder encoder;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.mail-from:}") private String from;
    public static String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    @Transactional
    public synchronized void send(String rawEmail) {
        String email = normalize(rawEmail);
        var old = repository.lockByEmail(email);
        if (old.isPresent() && old.get().getSentAt() != null && old.get().getSentAt().plusSeconds(60).isAfter(LocalDateTime.now()))
            throw new IllegalArgumentException("인증번호 재발송은 60초 후 가능합니다.");
        String code = String.format("%06d", random.nextInt(1_000_000));
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) message.setFrom(from);
        message.setTo(email); message.setSubject("CampusFlow 이메일 인증번호");
        message.setText("인증번호: " + code + "\n10분 안에 입력하세요. 본인이 요청하지 않았다면 무시하세요.");
        mailSender.send(message);
        repository.save(new EmailVerification(email, encoder.encode(code), LocalDateTime.now().plusMinutes(10)));
    }
    @Transactional
    public String verify(String rawEmail, String code) {
        var item = repository.lockByEmail(normalize(rawEmail)).orElse(null);
        if (item == null || item.isVerified() || item.getAttempts() >= 5 || !item.getExpiresAt().isAfter(LocalDateTime.now())) return null;
        item.attempt();
        if (!encoder.matches(code, item.getCodeHash())) return null;
        String token = UUID.randomUUID().toString() + UUID.randomUUID();
        item.authorize(encoder.encode(token));
        return token;
    }
    @Transactional
    public boolean consume(String rawEmail, String token) {
        if (token == null || token.isBlank()) return false;
        var item = repository.lockByEmail(normalize(rawEmail)).orElse(null);
        if (item == null || !item.isVerified() || !item.getExpiresAt().isAfter(LocalDateTime.now()) || !encoder.matches(token, item.getTokenHash())) return false;
        repository.delete(item);
        return true;
    }
}
