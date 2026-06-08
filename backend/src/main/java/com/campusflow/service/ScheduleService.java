package com.campusflow.service;

import com.campusflow.dto.ScheduleBlockRequest;
import com.campusflow.dto.ScheduleBlockResponse;
import com.campusflow.entity.ScheduleBlock;
import com.campusflow.entity.ScheduleCategory;
import com.campusflow.entity.User;
import com.campusflow.entity.UserSchedule;
import com.campusflow.repository.ScheduleBlockRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.UserScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ScheduleService {

    private final ScheduleBlockRepository scheduleBlockRepository;
    private final UserScheduleRepository userScheduleRepository;
    private final UserRepository userRepository;

    /** 유저의 전체 시간표 블록 조회 */
    @Transactional(readOnly = true)
    public List<ScheduleBlockResponse> getUserSchedule(String userId) {
        return userScheduleRepository.findByUser_UserId(userId)
                .map(us -> us.getBlocks().stream().map(ScheduleBlockResponse::from).toList())
                .orElse(List.of());
    }

    /** 시간표 블록 추가 (수업/개인/공강 등 모든 카테고리) */
    public ScheduleBlockResponse addBlock(ScheduleBlockRequest req) {
        UserSchedule userSchedule = userScheduleRepository.findByUser_UserId(req.userId())
                .orElseGet(() -> {
                    User user = userRepository.findById(req.userId())
                            .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
                    return userScheduleRepository.save(UserSchedule.builder().user(user).build());
                });

        ScheduleCategory category = ScheduleCategory.CLASS;
        try { category = ScheduleCategory.valueOf(req.category()); } catch (Exception ignored) {}

        ScheduleBlock block = ScheduleBlock.builder()
                .userSchedule(userSchedule)
                .category(category)
                .title(req.title())
                .dayOfWeek(req.dayOfWeek())
                .startTime(LocalTime.parse(req.startTime()))
                .endTime(LocalTime.parse(req.endTime()))
                .build();

        return ScheduleBlockResponse.from(scheduleBlockRepository.save(block));
    }

    /** 시간표 블록 삭제 */
    public void deleteBlock(String blockId) {
        scheduleBlockRepository.deleteById(blockId);
    }
}
