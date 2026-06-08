package com.campusflow.dto;

import lombok.*;
import java.time.LocalTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FreeTimeRequest {
    private String userId;
    private String title;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
}
