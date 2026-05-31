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
        return scheduleBlockRepository.findFreeTimesByUserId(userId).stream()
                .map(block -> new FreeTimeResponse(
                        block.getDayOfWeek(),
                        block.getStartTime(),
                        block.getEndTime(),
                        block.getTitle() != null ? block.getTitle() : "공강 시간"
                ))
                .toList();
    }

    public void saveFreeTime(FreeTimeRequest request) {
        UserSchedule userSchedule = userScheduleRepository
                .findByUser_UserId(request.getUserId())
                .orElseGet(() -> {
                    User user = userRepository.findById(request.getUserId())
                            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
                    UserSchedule newSchedule = UserSchedule.builder()
                            .user(user)
                            .build();
                    return userScheduleRepository.save(newSchedule);
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