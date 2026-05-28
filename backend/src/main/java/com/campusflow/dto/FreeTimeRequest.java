package com.campusflow.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalTime;

@Getter @Setter  // 💡 데이터가 접근 가능하도록 롬복 어노테이션 재확인
@NoArgsConstructor
@AllArgsConstructor
public class FreeTimeRequest {
    private String userId;
    private String title;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
}