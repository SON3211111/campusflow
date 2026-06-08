package com.campusflow.service;

import com.campusflow.dto.FreeTimeRequest;
import com.campusflow.dto.FreeTimeResponse;
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

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ScheduleService {

    private final ScheduleBlockRepository scheduleBlockRepository;
    private final UserScheduleRepository userScheduleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<FreeTimeResponse> getUserFreeTimes(String userId) {
        return scheduleBlockRepository.findFreeTimesByUserId(userId, ScheduleCategory.FREE).stream()
                .map(block -> new FreeTimeResponse(
                        block.getDayOfWeek(),
                        block.getStartTime(),
                        block.getEndTime(),
                        block.getTitle() != null ? block.getTitle() : "공강 시간"
                ))
                .toList();
    }

    public void saveFreeTime(FreeTimeRequest request) {
        // UserSchedule이 없으면 자동 생성 (기존 유저 대응)
        UserSchedule userSchedule = userScheduleRepository.findByUser_UserId(request.getUserId())
                .orElseGet(() -> {
                    User user = userRepository.findById(request.getUserId())
                            .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
                    return userScheduleRepository.save(UserSchedule.builder().user(user).build());
                });

        ScheduleBlock freeBlock = ScheduleBlock.builder()
                .userSchedule(userSchedule)
                .category(ScheduleCategory.FREE)
                .title(request.getTitle())
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        scheduleBlockRepository.save(freeBlock);
    }
}
