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

    public EmailVerification(String email, String codeHash, LocalDateTime expiresAt) {
        this.email = email;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    public void verify() { verified = true; }
}
