package com.campusflow.controller;

import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/recommend")
    public String recommendTasks(
            @RequestParam("title") String title,
            @RequestParam("desc") String desc) {
        return aiService.getAiRecommendation(title, desc);
    }
}