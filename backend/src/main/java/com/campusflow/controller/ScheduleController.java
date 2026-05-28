package com.campusflow.controller;

import com.campusflow.dto.FreeTimeRequest;
import com.campusflow.dto.FreeTimeResponse;
import com.campusflow.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * [캘린더 페이지용] 유저 고유 ID를 넘기면 해당 유저의 공강 시간표 세트를 반환합니다.
     * GET /api/schedules/free/student_01
     */
    @GetMapping("/free/{userId}")
    public ResponseEntity<List<FreeTimeResponse>> getUserFreeTimes(@PathVariable String userId) {
        List<FreeTimeResponse> freeTimes = scheduleService.getUserFreeTimes(userId);
        return ResponseEntity.ok(freeTimes);
    }

    /**
     * [캘린더 페이지용] 유저가 화면에서 직접 공강 시간을 등록할 때 호출하는 API
     * POST /api/schedules/free
     */
    @PostMapping("/free")
    public ResponseEntity<?> registerFreeTime(@RequestBody FreeTimeRequest request) {
        scheduleService.saveFreeTime(request);
        return ResponseEntity.ok().body("{\"message\": \"새로운 공강 시간이 캘린더에 등록되었습니다.\"}");
    }
}