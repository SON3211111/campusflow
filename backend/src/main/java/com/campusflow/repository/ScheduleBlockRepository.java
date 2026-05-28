package com.campusflow.repository;

import com.campusflow.entity.ScheduleBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScheduleBlockRepository extends JpaRepository<ScheduleBlock, String> {

    // 💡 핵심 쿼리: 특정 유저의 일정 중 카테고리가 'FREE'(공강)인 블록만 요일/시간 순으로 정렬해서 가져옴
    @Query("SELECT b FROM ScheduleBlock b " +
            "WHERE b.userSchedule.user.userId = :userId " +
            "AND b.category = com.campusflow.entity.ScheduleCategory.FREE " +
            "ORDER BY b.dayOfWeek ASC, b.startTime ASC")
    List<ScheduleBlock> findFreeTimesByUserId(@Param("userId") String userId);
}