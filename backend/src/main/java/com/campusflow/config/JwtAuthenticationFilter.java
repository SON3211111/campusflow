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
import java.util.Set;

/**
 * JWT 인증 필터 - 모든 HTTP 요청에 대해 JWT 토큰을 검증하고 인증 정보를 등록
 * Authorization: Bearer {token} 헤더에서 토큰을 추출하여 유효성 확인 후
 * SecurityContext에 인증 객체를 설정함
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenProvider tokenProvider;

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/auth/login", "/api/auth/signup", "/api/auth/search"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (token != null) {
            if (tokenProvider.validateToken(token)) {
                // 유효한 토큰 → SecurityContext에 인증 정보 등록
                String email = tokenProvider.getEmail(token);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(email, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                // 토큰이 존재하지만 만료/위조된 경우 → 401 반환 (로그인/회원가입 경로 제외)
                String path = request.getRequestURI();
                if (!PUBLIC_PATHS.contains(path)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"status\":401,\"message\":\"토큰이 만료되었습니다.\",\"data\":null}");
                    return;
                }
            }
        }

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
