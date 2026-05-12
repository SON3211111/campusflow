package com.campusflow.config;

import com.campusflow.entity.enums.UserRole; // [추가] Enum 사용
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class TokenProvider {

    private final SecretKey key;
    private final long tokenValidityInMilliseconds;

    // application.yml 등에 설정된 비밀키를 가져옴 (없으면 임시 키 사용)
    public TokenProvider(
            @Value("${jwt.secret:vmfhaltjskstkfkdgodyroqkfwkdbalroqkfwkdbal}") String secret,
            @Value("${jwt.expiration:3600000}") long validity) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.tokenValidityInMilliseconds = validity;
    }

    // 1. 토큰 생성
    public String createToken(String email, UserRole role) { // [수정] String 대신 Enum 사용
        Date now = new Date();
        Date validity = new Date(now.getTime() + tokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(email)
                .claim("role", role.name()) // Enum 이름을 문자열로 저장
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // 2. 토큰에서 이메일 추출 (나중에 필터에서 사용)
    public String getEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // 3. 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}