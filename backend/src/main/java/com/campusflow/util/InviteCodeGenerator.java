package com.campusflow.util;

import java.security.SecureRandom;
import java.time.LocalDateTime;

public class InviteCodeGenerator {
    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    public static LocalDateTime calculateExpiry(int days) {
        return LocalDateTime.now().plusDays(days);
    }
}
