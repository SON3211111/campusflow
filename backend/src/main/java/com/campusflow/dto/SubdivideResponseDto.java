package com.campusflow.dto;

import java.util.List;

// AI 서버 /subdivide-task 응답 구조
public record SubdivideResponseDto(List<String> tasks) {}
