package com.campusflow.repository;

import com.campusflow.entity.UserSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserScheduleRepository extends JpaRepository<UserSchedule, String> {
    Optional<UserSchedule> findByUser_UserId(String userId);
}
