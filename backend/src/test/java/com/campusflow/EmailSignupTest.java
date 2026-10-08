package com.campusflow;
import com.campusflow.repository.EmailVerificationRepository;
import com.campusflow.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:email-test;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class EmailSignupTest {
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper json;
 @Autowired EmailVerificationRepository codes;
 @Autowired UserRepository users;
 @MockBean JavaMailSender mail;
 String email;
 String code;
 @BeforeEach void setup() {
  email=UUID.randomUUID()+"@example.com";
  doAnswer(i -> { code=((SimpleMailMessage)i.getArgument(0)).getText().replaceAll("(?s).*?([0-9]{6}).*", "$1"); return null; }).when(mail).send(any(SimpleMailMessage.class));
 }
 String request(String path,Object body,int expected) throws Exception {
  return mvc.perform(post("/api/auth/"+path).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
 }
 void send() throws Exception { request("email/send",Map.of("email",email),200); }
 String verify() throws Exception { return json.readTree(request("email/verify",Map.of("email",email,"code",code),200)).path("data").path("verificationToken").asText(); }
 Map<String,String> signup(String token) { return Map.of("email",email,"name","Tester","password","test-password-123","role","STUDENT","verificationToken",token); }
 @Test void unverifiedSignupIsBlocked() throws Exception {
  request("signup",signup(""),403); assertFalse(users.existsByEmail(email));
 }
 @Test void completeFlowConsumesProofAndAllowsOrdinaryLogin() throws Exception {
  send(); String token=verify(); request("signup",signup(token),201);
  assertTrue(users.existsByEmail(email)); assertTrue(codes.findById(email).isEmpty());
  request("login",Map.of("email",email,"password","test-password-123"),200);
 }
 @Test void proofCannotBeUsedForAnotherEmail() throws Exception {
  send(); String token=verify(); email="other-"+email; request("signup",signup(token),403);
 }
 @Test void fiveWrongAttemptsBlockCorrectCode() throws Exception {
  send(); String wrong=code.equals("000000")?"111111":"000000";
  for(int i=0;i<5;i++) request("email/verify",Map.of("email",email,"code",wrong),400);
  request("email/verify",Map.of("email",email,"code",code),400);
 }
 @Test void expiredCodeIsRejected() throws Exception {
  send(); var record=codes.findById(email).orElseThrow(); ReflectionTestUtils.setField(record,"expiresAt",LocalDateTime.now().minusMinutes(1)); codes.save(record);
  request("email/verify",Map.of("email",email,"code",code),400);
 }
 @Test void resendInvalidatesOldProofAndHasCooldown() throws Exception {
  send(); String token=verify(); request("email/send",Map.of("email",email),400);
  var record=codes.findById(email).orElseThrow(); ReflectionTestUtils.setField(record,"sentAt",LocalDateTime.now().minusMinutes(2)); codes.save(record);
  send(); request("signup",signup(token),403);
 }
 @Test void deliveryFailureDoesNotStoreChallenge() throws Exception {
  doThrow(new MailSendException("test failure")).when(mail).send(any(SimpleMailMessage.class));
  request("email/send",Map.of("email",email),503); assertTrue(codes.findById(email).isEmpty());
 }
}
