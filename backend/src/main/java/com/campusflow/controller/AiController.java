package com.campusflow.controller;

import com.campusflow.dto.AiRecommendationRequest;
import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 서버(Python FastAPI)와 연동하는 컨트롤러
 * - /recommend  : 제목+설명 기반 업무 추천
 * - /generate   : 자유 프롬프트 → 텍스트 생성 (세부 분할 등)
 * - /generate-tasks : 프롬프트 기반 업무 트리 자동 분해
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    // 업무 추천: 프로젝트 제목+설명을 AI에 전달하여 추천 결과 반환
    @PostMapping("/recommend")
    public ResponseEntity<String> recommendTasks(@RequestBody AiRecommendationRequest request) {
        String result = aiService.getAiRecommendation(request);
        return ResponseEntity.ok(result);
    }

    // 단일 프롬프트 전송 → AI 응답 텍스트 반환 (태스크 세부 분할에 사용)
    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generate(@RequestBody Map<String, String> body) {
        String prompt = body.getOrDefault("prompt", "");
        try {
            String result = aiService.generate(prompt);
            return ResponseEntity.ok(Map.of("result", result));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // 업무 트리 생성: 제목+설명 → 카테고리별 태스크 목록 반환
    @PostMapping("/generate-tasks")
    public ResponseEntity<TaskListDto> generateTasks(
            @RequestParam("title") String title,
            @RequestParam("description") String description) {
        try {
            TaskListDto result = aiService.generateTasks(title, description);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
