package com.campusflow.dto;

import java.util.List;

// AI 서버 /generate-tasks 응답 전체 구조
// AI main.py의 TaskGenerateResponse 클래스와 일치해야 함
public record TaskListDto(List<TaskDto> tasks) {}
