package com.campusflow.service;

import com.campusflow.dto.TaskListDto;
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

    // 기존 범용 텍스트 생성 (그대로 유지)
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

    // 장바구니용 업무 카드 목록 생성
    // AI 서버의 POST /generate-tasks 를 호출
    // 입력: 프로젝트 제목 + 설명
    // 출력: 업무 카드 목록 (category, priority, estimated_hours 포함)
    public TaskListDto generateTasks(String title, String description) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // AI 서버가 기대하는 형식: { "title": "...", "description": "..." }
            HttpEntity<Map<String, String>> request = new HttpEntity<>(
                    Map.of("title", title, "description", description),
                    headers
            );

            TaskListDto response = restTemplate.postForObject(
                    aiServerUrl + "/generate-tasks", request, TaskListDto.class);

            return (response != null) ? response : new TaskListDto(java.util.List.of());
        } catch (Exception e) {
            throw new RuntimeException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
