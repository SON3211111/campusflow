package com.campusflow.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
public class EmailVerification {
    @Id
    private String email;
    private String codeHash;
    private LocalDateTime expiresAt;
    private boolean verified;
    private int attempts;
    private LocalDateTime sentAt;
    private String tokenHash;
    public void attempt() { attempts++; }
    public void authorize(String hash) { verified = true; tokenHash = hash; }


    public EmailVerification(String email, String codeHash, LocalDateTime expiresAt) {
        this.sentAt = LocalDateTime.now();
        this.email = email;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    public void verify() { verified = true; }
}
