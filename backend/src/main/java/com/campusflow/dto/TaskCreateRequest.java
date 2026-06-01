package com.campusflow.dto;

/** 태스크 생성 요청 DTO (status/dueDate/assigneeId/priority는 선택 입력, 미입력 시 기본값 적용) */
public record TaskCreateRequest(String title, String description, String status, String dueDate, String assigneeId, String priority) {}
