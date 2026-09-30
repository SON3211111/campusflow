package com.campusflow.config;

import com.campusflow.entity.User;
import com.campusflow.entity.enums.UserRole;
import com.campusflow.entity.enums.UserStatus;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuthLoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final TokenProvider tokenProvider;
    @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User profile = (OAuth2User) authentication.getPrincipal();
        String provider = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
        Map<String, Object> attributes = profile.getAttributes();
        Map<String, Object> account = nested(attributes, provider.equals("naver") ? "response" : "kakao_account");
        String providerId = provider.equals("naver") ? value(account, "id") : String.valueOf(attributes.get("id"));
        if (providerId == null || providerId.equals("null")) {
            response.sendRedirect(frontendUrl + "/login?oauthError=provider_failed");
            return;
        }
        String email = value(account, "email");
        String accountEmail = email == null ? provider + "-" + providerId + "@oauth.campusflow.local" : email;
        User user = userRepository.findByOauthProviderAndOauthProviderId(provider, providerId)
                .or(() -> userRepository.findByEmail(accountEmail))
                .orElseGet(() -> {
            String name = value(account, "name");
            if (name == null && provider.equals("kakao")) name = value(nested(attributes, "properties"), "nickname");
            if (name == null) name = value(account, "nickname");
            User saved = userRepository.save(User.builder().userId(java.util.UUID.randomUUID().toString())
                    .email(accountEmail).name(name == null ? provider + " 사용자" : name).role(UserRole.STUDENT)
                    .status(UserStatus.ACTIVE).oauthProvider(provider).oauthProviderId(providerId).build());
            workspaceService.createDefaultPersonalWorkspace(saved);
            return saved;
        });
        if (user.getOauthProviderId() == null) {
            user.setOauthProvider(provider);
            user.setOauthProviderId(providerId);
            user = userRepository.save(user);
        }
        String url = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("accessToken", tokenProvider.createToken(user.getEmail(), user.getRole()))
                .queryParam("userId", user.getUserId()).queryParam("name", user.getName()).build().encode().toUriString();
        getRedirectStrategy().sendRedirect(request, response, url);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> nested(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

    private String value(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        return value instanceof String text && !text.isBlank() ? text : null;
    }
}
