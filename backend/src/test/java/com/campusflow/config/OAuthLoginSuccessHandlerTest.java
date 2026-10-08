package com.campusflow.config;

import com.campusflow.entity.User;
import com.campusflow.entity.enums.UserRole;
import com.campusflow.entity.enums.UserStatus;
import com.campusflow.repository.UserRepository;
import com.campusflow.service.WorkspaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OAuthLoginSuccessHandlerTest {
    UserRepository users = mock(UserRepository.class);
    WorkspaceService workspaces = mock(WorkspaceService.class);
    TokenProvider tokens = mock(TokenProvider.class);
    OAuthLoginSuccessHandler handler = new OAuthLoginSuccessHandler(users, workspaces, tokens);
    MockHttpServletResponse response = new MockHttpServletResponse();
    @BeforeEach void setup() {
        ReflectionTestUtils.setField(handler, "frontendUrl", "http://localhost:5173");
    }
    void login() throws Exception {
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        var profile = new DefaultOAuth2User(authorities, Map.of("id", "42", "kakao_account", Map.of("email", "member@example.com")), "id");
        handler.onAuthenticationSuccess(new MockHttpServletRequest(), response,
                new OAuth2AuthenticationToken(profile, authorities, "kakao"));
    }
    @Test void existingAccountReturnsTokenInFragmentAndRole() throws Exception {
        var user = User.builder().userId("u1").email("member@example.com").name("Member").role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE).oauthProvider("kakao").oauthProviderId("42").build();
        when(users.findByOauthProviderAndOauthProviderId("kakao", "42")).thenReturn(Optional.of(user));
        when(tokens.createToken(user.getEmail(), user.getRole())).thenReturn("test-token");
        login();
        assertTrue(response.getRedirectedUrl().startsWith("http://localhost:5173/login#accessToken=test-token"));
        assertTrue(response.getRedirectedUrl().contains("role=STUDENT"));
        verifyNoInteractions(workspaces);
    }
    @Test void matchingEmailDoesNotAutoLinkPasswordAccount() throws Exception {
        when(users.findByEmail("member@example.com")).thenReturn(Optional.of(User.builder().build()));
        login();
        assertTrue(response.getRedirectedUrl().endsWith("oauthError=account_exists"));
        verify(users, never()).save(any());
        verifyNoInteractions(tokens, workspaces);
    }
    @Test void inactiveUserCannotGetToken() throws Exception {
        when(users.findByOauthProviderAndOauthProviderId("kakao", "42")).thenReturn(Optional.of(
                User.builder().status(UserStatus.INACTIVE).build()));
        login();
        assertTrue(response.getRedirectedUrl().endsWith("oauthError=inactive"));
        verifyNoInteractions(tokens);
    }
    @Test void newAccountCreatesPersonalWorkspace() throws Exception {
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokens.createToken(any(), any())).thenReturn("new-token");
        login();
        verify(workspaces).createDefaultPersonalWorkspace(argThat(u -> "42".equals(u.getOauthProviderId()) && u.getPassword() == null));
        assertTrue(response.getRedirectedUrl().contains("#accessToken=new-token"));
    }
}
