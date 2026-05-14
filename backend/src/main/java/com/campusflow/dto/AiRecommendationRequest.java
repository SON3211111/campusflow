package com.campusflow.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/** AI 업무 추천 요청 DTO (프로젝트 제목 + 설명을 AI에 전달) */
@Getter
@NoArgsConstructor
public class AiRecommendationRequest {
    private String title;
    private String description;
}
