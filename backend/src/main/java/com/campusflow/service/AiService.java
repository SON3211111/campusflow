package com.campusflow.service;

import com.campusflow.dto.AiRecommendationRequest;
import com.campusflow.dto.AiResponseDto;
import com.campusflow.dto.TaskListDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final RestTemplate restTemplate;
    private final String aiServerUrl;

    public AiService(@Value("${AI_SERVER_URL:http://localhost:8000}") String aiServerUrl) {
        this.aiServerUrl = aiServerUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(350_000);
        this.restTemplate = new RestTemplate(factory);
    }

    public String getAiRecommendation(AiRecommendationRequest requestDto) {
        String prompt = requestDto.title() + " : " + requestDto.description();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(Map.of("prompt", prompt), headers);

            ResponseEntity<AiResponseDto> response = restTemplate.exchange(
                    aiServerUrl + "/generate",
                    HttpMethod.POST,
                    request,
                    AiResponseDto.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String result = response.getBody().result();
                return (result != null) ? result : "AI 서버로부터 결과가 오지 않았습니다.";
            }
            return "AI 서버 응답 오류: " + response.getStatusCode();
        } catch (Exception e) {
            log.error("AI 추천 서비스 호출 중 에러 발생: {}", e.getMessage());
            return "AI 추천 서비스를 일시적으로 사용할 수 없습니다.";
        }
    }

    public TaskListDto generateTasks(String title, String description) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(
                    Map.of("title", title, "description", description),
                    headers
            );

            TaskListDto response = restTemplate.postForObject(
                    aiServerUrl + "/generate-tasks", request, TaskListDto.class);

            return (response != null) ? response : new TaskListDto(List.of());
        } catch (Exception e) {
            throw new RuntimeException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
