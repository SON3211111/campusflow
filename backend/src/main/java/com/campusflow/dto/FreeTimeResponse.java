package com.campusflow.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalTime;

@Getter
@AllArgsConstructor
public class FreeTimeResponse {
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private String title;
}
