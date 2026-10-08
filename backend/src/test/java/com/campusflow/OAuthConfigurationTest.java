package com.campusflow;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("oauth")
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:oauth-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.hibernate.ddl-auto=create-drop",
    "NAVER_CLIENT_ID=test", "NAVER_CLIENT_SECRET=test", "KAKAO_REST_API_KEY=test", "KAKAO_CLIENT_SECRET=test"
})
class OAuthConfigurationTest {
    @Autowired ClientRegistrationRepository clients;
    @Test void configuredProvidersHaveValidCallbackTemplates() {
        assertEquals("{baseUrl}/login/oauth2/code/{registrationId}", clients.findByRegistrationId("naver").getRedirectUri());
        assertNotNull(clients.findByRegistrationId("kakao"));
    }
}
