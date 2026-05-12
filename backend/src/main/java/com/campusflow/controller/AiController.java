package com.campusflow.controller;

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

    // 기존 범용 텍스트 추천 (그대로 유지)
    @PostMapping("/recommend")
    public String recommendTasks(
            @RequestParam("title") String title,
            @RequestParam("desc") String desc) {
        return aiService.getAiRecommendation(title, desc);
    }

    // 장바구니용 업무 카드 생성
    // 프론트엔드에서 팀장이 프로젝트 정보 입력 시 호출
    // 응답: { "tasks": [ { title, description, category, priority, estimatedHours } ] }
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
