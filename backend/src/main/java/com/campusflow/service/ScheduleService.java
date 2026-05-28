package com.campusflow.service;

import com.campusflow.dto.FreeTimeRequest;
import com.campusflow.dto.FreeTimeResponse;
import com.campusflow.entity.ScheduleBlock;
import com.campusflow.entity.ScheduleCategory;
import com.campusflow.entity.UserSchedule;
import com.campusflow.repository.ScheduleBlockRepository;
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
    private final UserScheduleRepository userScheduleRepository; // 의존성 주입 완료

    /**
     * [조회] 특정 유저의 등록된 '공강 시간(FREE)' 블록 리스트 조회
     */
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

    /**
     * [등록] 캘린더 페이지에서 유저가 직접 공강 시간을 등록하는 로직
     */
    public void saveFreeTime(FreeTimeRequest request) {
        UserSchedule userSchedule = userScheduleRepository.findByUser_UserId(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("해당 유저의 시간표 마스터가 존재하지 않습니다."));

        ScheduleBlock freeBlock = ScheduleBlock.builder()
                .userSchedule(userSchedule)
                .category(ScheduleCategory.FREE) // FREE(공강) 카테고리로 고정 설정
                .title(request.getTitle())
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        scheduleBlockRepository.save(freeBlock);
    }
}