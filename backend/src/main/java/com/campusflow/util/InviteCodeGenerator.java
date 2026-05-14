package com.campusflow.util;

import java.security.SecureRandom;
import java.time.LocalDateTime;

public class InviteCodeGenerator {
    // 헷갈리기 쉬운 I, O, 0, 1을 제외한 문자셋
    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom random = new SecureRandom();

    public static String generateCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }

    public static LocalDateTime calculateExpiry(int days) {
        return LocalDateTime.now().plusDays(days);
    }
}