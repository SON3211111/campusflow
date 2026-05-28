package com.campusflow.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalTime;

@Getter
@AllArgsConstructor
public class FreeTimeResponse {
    private String dayOfWeek;       // 요일 (예: "월" 또는 "MONDAY")
    private LocalTime startTime;    // 공강 시작 시간
    private LocalTime endTime;      // 공강 종료 시간
    private String title;           // 블록 이름 (예: "우주공강", "오후 비는 시간")
}