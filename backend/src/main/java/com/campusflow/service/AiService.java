package com.campusflow.service;

import com.campusflow.dto.SubdivideResponseDto;
import com.campusflow.dto.TaskListDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Python FastAPI AI 서버와 HTTP 통신하는 서비스
 * 커넥션 타임아웃 10초, 읽기 타임아웃 350초 (AI 처리 시간 고려)
 */
@Service
@Slf4j
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

    public SubdivideResponseDto subdivideTask(String task, String category) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(
                    Map.of("task", task, "category", category),
                    headers
            );

            SubdivideResponseDto response = restTemplate.postForObject(
                    aiServerUrl + "/subdivide-task", request, SubdivideResponseDto.class);

            return (response != null) ? response : new SubdivideResponseDto(List.of());
        } catch (Exception e) {
            throw new RuntimeException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
