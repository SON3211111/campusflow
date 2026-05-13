package com.campusflow.controller;

import com.campusflow.dto.AiRecommendationRequest;
import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
