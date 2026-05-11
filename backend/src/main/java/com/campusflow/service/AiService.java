package com.campusflow.backend.service;

import com.campusflow.backend.dto.AiRequestDto;
import com.campusflow.backend.dto.AiResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class AiService {

    private final RestClient restClient;

    public AiService(@Value("${AI_SERVER_URL:http://localhost:8000}") String aiServerUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(aiServerUrl)
                .build();
    }

    public String getAiRecommendation(String title, String description) {
        String prompt = title + " : " + description;
        try {
            AiResponseDto response = restClient.post()
                    .uri("/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new AiRequestDto(prompt))
                    .retrieve()
                    .body(AiResponseDto.class);
            return (response != null) ? response.result() : "응답 없음";
        } catch (Exception e) {
            return "에러 발생: " + e.getMessage();
        }
    }
}