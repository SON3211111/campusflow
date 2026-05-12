package com.campusflow.controller;

import com.campusflow.dto.AiRecommendationRequest; // DTO 추가 필요
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    /**
     * AI 태스크 추천 API
     * @RequestParam 대신 @RequestBody를 사용하여 확장성을 높였습니다.
     */
    @PostMapping("/recommend")
    public ResponseEntity<String> recommendTasks(@RequestBody AiRecommendationRequest request) {
        // 서비스 레이어에서 DB의 프로젝트 ID 등을 함께 처리할 수 있도록 객체 전달
        String result = aiService.getAiRecommendation(request);
        return ResponseEntity.ok(result);
    }
}