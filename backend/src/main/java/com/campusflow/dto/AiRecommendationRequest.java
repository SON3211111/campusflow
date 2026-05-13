package com.campusflow.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AiRecommendationRequest {
    private String title;
    private String description;
}
