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
        // [테스트 모드] AI 서버 없이 가짜 데이터를 즉시 반환
        // return String.format("[가짜 응답] '%s' 프로젝트 추천 작업:\n1. 요구사항 정의\n2. DB 설계\n3. API 개발", title);

        // [실전 모드] AI 서버 완성 시 아래 주석 해제 후 위 return 문 삭제
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