package com.campusflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * JWT 인증 필터 - 모든 HTTP 요청에 대해 JWT 토큰을 검증하고 인증 정보를 등록
 * Authorization: Bearer {token} 헤더에서 토큰을 추출하여 유효성 확인 후
 * SecurityContext에 인증 객체를 설정함
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 1. 요청 헤더에서 JWT 토큰 추출
        String token = extractToken(request);

        // 2. 토큰이 유효하면 SecurityContext에 인증 정보 등록
        if (token != null && tokenProvider.validateToken(token)) {
            String email = tokenProvider.getEmail(token);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(email, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        // 3. 다음 필터 체인으로 요청 전달
        filterChain.doFilter(request, response);
    }

    // Authorization 헤더에서 "Bearer " 접두어를 제거하고 순수 토큰 반환
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
