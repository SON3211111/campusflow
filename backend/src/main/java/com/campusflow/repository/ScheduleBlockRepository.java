package com.campusflow.repository;

import com.campusflow.entity.ScheduleBlock;
import com.campusflow.entity.ScheduleCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScheduleBlockRepository extends JpaRepository<ScheduleBlock, String> {

    @Query("SELECT b FROM ScheduleBlock b WHERE b.userSchedule.user.userId = :userId AND b.category = :category ORDER BY b.dayOfWeek ASC, b.startTime ASC")
    List<ScheduleBlock> findFreeTimesByUserId(@Param("userId") String userId, @Param("category") ScheduleCategory category);
}
