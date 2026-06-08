package com.campusflow.dto;

/** 태스크 생성 요청 DTO */
public record TaskCreateRequest(String title, String description, String status, String startDate, String dueDate, String assigneeId, String priority, String boardColumn) {}
