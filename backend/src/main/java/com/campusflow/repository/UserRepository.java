package com.campusflow.repository;

import com.campusflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    // 이메일로 사용자 조회 기능 추가
    Optional<User> findByEmail(String email);
}