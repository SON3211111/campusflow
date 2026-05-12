package com.campusflow.service;

import com.campusflow.dto.AiRecommendationRequest;
import com.campusflow.dto.AiRequestDto;
import com.campusflow.dto.AiResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class AiService {

    private final RestTemplate restTemplate;
    private final String aiServerUrl;

    // @RequiredArgsConstructor를 제거하고 직접 생성자를 통해
    // RestTemplate 설정과 URL 주입을 동시에 처리합니다.
    public AiService(@Value("${AI_SERVER_URL:http://localhost:8000}") String aiServerUrl) {
        this.aiServerUrl = aiServerUrl;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);   // 연결 타임아웃 10초
        factory.setReadTimeout(350_000);     // AI 응답 대기 타임아웃 350초
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * AI로부터 추천 결과를 가져오는 핵심 메서드
     */
    public String getAiRecommendation(AiRecommendationRequest requestDto) {

        // [수정 포인트]
        // AiRequestDto(record)가 (String, String)을 요구하므로
        // 제목(Title)과 설명(Description)을 콤마(,)로 구분하여 2개의 인자로 전달합니다.
        AiRequestDto aiRequest = new AiRequestDto(
                requestDto.getTitle(),
                requestDto.getDescription()
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<AiRequestDto> entity = new HttpEntity<>(aiRequest, headers);

            log.info("AI 서버 호출 시작: {}", aiServerUrl + "/generate");

            // AI 서버 호출 (AiResponseDto로 결과 매핑)
            ResponseEntity<AiResponseDto> response = restTemplate.exchange(
                    aiServerUrl + "/generate",
                    HttpMethod.POST,
                    entity,
                    AiResponseDto.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                // AiResponseDto(record)의 result() 메서드 호출
                String result = response.getBody().result();
                return (result != null) ? result : "AI 서버로부터 결과가 오지 않았습니다.";
            }

            return "AI 서버 응답 오류: " + response.getStatusCode();

        } catch (Exception e) {
            log.error("AI 추천 서비스 호출 중 에러 발생: {}", e.getMessage());
            return "AI 추천 서비스를 일시적으로 사용할 수 없습니다. (사유: " + e.getMessage() + ")";
        }
    }
}