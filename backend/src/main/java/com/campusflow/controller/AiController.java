package com.campusflow.controller;

import com.campusflow.dto.AiRecommendationRequest;
import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/recommend")
    public ResponseEntity<String> recommendTasks(@RequestBody AiRecommendationRequest request) {
        String result = aiService.getAiRecommendation(request);
        return ResponseEntity.ok(result);
    }

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
