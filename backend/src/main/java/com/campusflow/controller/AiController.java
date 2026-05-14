package com.campusflow.controller;

import com.campusflow.dto.SubdivideResponseDto;
import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 서버(Python FastAPI)와 연동하는 컨트롤러
 * - /generate-tasks  : 프로젝트 제목+설명 → 업무 카드 목록 생성
 * - /subdivide-task  : 단일 업무 → 2개 세부 업무로 분해
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate-tasks")
    public ResponseEntity<TaskListDto> generateTasks(
            @RequestParam String title,
            @RequestParam String description) {
        try {
            TaskListDto result = aiService.generateTasks(title, description);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/subdivide-task")
    public ResponseEntity<SubdivideResponseDto> subdivideTask(@RequestBody Map<String, String> body) {
        String task     = body.getOrDefault("task", "");
        String category = body.getOrDefault("category", "");
        try {
            SubdivideResponseDto result = aiService.subdivideTask(task, category);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
