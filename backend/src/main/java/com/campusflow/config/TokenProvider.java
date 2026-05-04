package com.campusflow.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class TokenProvider {
    // 보안을 위해 실제 서비스에서는 환경변수로 관리해야 하지만, 지금은 테스트용 키를 생성합니다.
    private final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    // 토큰 유효 시간: 1시간
    private final long tokenValidityInMilliseconds = 1000 * 60 * 60;

    public String createToken(String email, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + tokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(email) // 보통 이메일이나 ID를 담음
                .claim("role", role) // 사용자 권한 담기
                .setIssuedAt(now)
                .setExpiration(validity) // 만료 시간 설정
                .signWith(key, SignatureAlgorithm.HS256) // 암호화 알고리즘
                .compact();
    }
}