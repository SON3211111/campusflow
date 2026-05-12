package com.campusflow.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter // 이거 필수!
@NoArgsConstructor
public class AiRecommendationRequest {
    private String title;
    private String description;
}