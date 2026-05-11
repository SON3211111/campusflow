package com.campusflow.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class AiService {

    private final RestTemplate restTemplate;
    private final String aiServerUrl;

    public AiService(@Value("${AI_SERVER_URL:http://localhost:8000}") String aiServerUrl) {
        this.aiServerUrl = aiServerUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(350_000);
        this.restTemplate = new RestTemplate(factory);
    }

    public String getAiRecommendation(String title, String description) {
        String prompt = title + " : " + description;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(Map.of("prompt", prompt), headers);

            Map<?, ?> response = restTemplate.postForObject(
                    aiServerUrl + "/generate", request, Map.class);
            return (response != null) ? String.valueOf(response.get("result")) : "응답 없음";
        } catch (Exception e) {
            return "에러 발생: " + e.getMessage();
        }
    }
}