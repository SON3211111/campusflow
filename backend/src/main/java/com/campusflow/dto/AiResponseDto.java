package com.campusflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiResponseDto(
        @JsonProperty("result") // AI 서버의 JSON 키값이 "result"라면 이대로 유지
        String result
) {}