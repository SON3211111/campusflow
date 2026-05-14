package com.campusflow.repository;

import com.campusflow.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    // [추가] 초대 코드로 프로젝트를 조회하는 메서드
    Optional<Project> findByInviteCode(String inviteCode);
}