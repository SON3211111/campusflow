package com.campusflow.service;

import com.campusflow.dto.SubdivideResponseDto;
import com.campusflow.dto.TaskDto;
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

    public TaskListDto generateTasks(String description) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(
                    Map.of("description", description),
                    headers
            );

            TaskListDto response = restTemplate.postForObject(
                    aiServerUrl + "/generate-tasks", request, TaskListDto.class);

            return (response != null) ? response : new TaskListDto(List.of());
        } catch (Exception e) {
            log.warn("AI server generate-tasks failed. Falling back to local template. reason={}", e.getMessage());
            return fallbackTasks(description);
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
            log.warn("AI server subdivide-task failed. Falling back to local template. reason={}", e.getMessage());
            return fallbackSubtasks(task);
        }
    }

    private TaskListDto fallbackTasks(String description) {
        String topic = description == null || description.isBlank() ? "프로젝트" : description.strip();
        return new TaskListDto(List.of(
                new TaskDto("요구사항 정리", topic + "의 목표, 범위, 제약사항을 문서로 정리합니다.", "기획", "HIGH", 2),
                new TaskDto("역할 분담", "팀원별 담당 영역과 산출물을 정하고 공유합니다.", "기획", "HIGH", 1),
                new TaskDto("자료 조사", "관련 사례와 참고 자료를 수집하고 출처를 정리합니다.", "자료조사", "MEDIUM", 4),
                new TaskDto("구조 설계", "작업 흐름과 필요한 구성 요소를 큰 단위로 설계합니다.", "설계", "HIGH", 3),
                new TaskDto("초안 작성", "핵심 내용을 바탕으로 1차 결과물을 작성합니다.", "제작", "MEDIUM", 5),
                new TaskDto("세부 구현", "담당 파트별 세부 작업을 진행하고 중간 결과를 공유합니다.", "제작", "MEDIUM", 6),
                new TaskDto("검토 및 수정", "오류, 누락, 품질 이슈를 확인하고 보완합니다.", "검토", "MEDIUM", 3),
                new TaskDto("최종 제출 준비", "최종본을 정리하고 제출 형식에 맞춰 마무리합니다.", "마무리", "LOW", 2)
        ), true);
    }

    private SubdivideResponseDto fallbackSubtasks(String task) {
        String title = task == null || task.isBlank() ? "업무" : task.strip();
        return new SubdivideResponseDto(List.of(
                new SubdivideResponseDto.SubdivideTaskItem(title + " 계획 수립", "필요한 자료, 기준, 담당자를 정리합니다."),
                new SubdivideResponseDto.SubdivideTaskItem(title + " 결과물 작성", "계획에 따라 작업하고 검토 가능한 결과물을 만듭니다.")
        ));
    }
}
