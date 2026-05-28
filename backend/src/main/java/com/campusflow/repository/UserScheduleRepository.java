package com.campusflow.repository;

import com.campusflow.entity.UserSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserScheduleRepository extends JpaRepository<UserSchedule, String> {
    // 유저 ID를 기반으로 해당 유저의 시간표 마스터를 찾아오는 메서드
    Optional<UserSchedule> findByUser_UserId(String userId);
}