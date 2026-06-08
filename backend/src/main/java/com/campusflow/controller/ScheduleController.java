package com.campusflow.controller;

import com.campusflow.dto.ScheduleBlockRequest;
import com.campusflow.dto.ScheduleBlockResponse;
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

    /** 유저의 전체 시간표 블록 조회 */
    @GetMapping("/{userId}")
    public ResponseEntity<List<ScheduleBlockResponse>> getUserSchedule(@PathVariable String userId) {
        return ResponseEntity.ok(scheduleService.getUserSchedule(userId));
    }

    /** 시간표 블록 추가 */
    @PostMapping
    public ResponseEntity<ScheduleBlockResponse> addBlock(@RequestBody ScheduleBlockRequest request) {
        return ResponseEntity.ok(scheduleService.addBlock(request));
    }

    /** 시간표 블록 삭제 */
    @DeleteMapping("/blocks/{blockId}")
    public ResponseEntity<Void> deleteBlock(@PathVariable String blockId) {
        scheduleService.deleteBlock(blockId);
        return ResponseEntity.ok().build();
    }
}
