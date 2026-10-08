package com.campusflow.repository;

import com.campusflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository // 스프링 빈으로 등록됨을 명시
public interface UserRepository extends JpaRepository<User, String> {

    // 1. 회원가입 시 이메일 중복 확인 및 로그인 시 유저 찾기
    Optional<User> findByEmail(String email);

    Optional<User> findByOauthProviderAndOauthProviderId(String oauthProvider, String oauthProviderId);

    // 2. [추가 권장] 활성화된 유저인지 확인하며 조회 (DB 설계의 status 반영)
    // status가 ACTIVE인 유저만 이메일로 찾고 싶을 때 사용
    Optional<User> findByEmailAndStatus(String email, com.campusflow.entity.enums.UserStatus status);

    // 3. [추가 권장] 이메일 존재 여부만 빠르게 확인
    boolean existsByEmail(String email);
}
