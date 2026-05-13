package com.campusflow.dto;

/**
 * AI 요청을 위한 간결한 레코드 DTO
 */
public record AiRequestDto(
        String projectId,
        String prompt
) {}