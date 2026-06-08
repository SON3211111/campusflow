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
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping("/free/{userId}")
    public ResponseEntity<List<FreeTimeResponse>> getUserFreeTimes(@PathVariable String userId) {
        return ResponseEntity.ok(scheduleService.getUserFreeTimes(userId));
    }

    @PostMapping("/free")
    public ResponseEntity<Void> registerFreeTime(@RequestBody FreeTimeRequest request) {
        scheduleService.saveFreeTime(request);
        return ResponseEntity.ok().build();
    }
}
