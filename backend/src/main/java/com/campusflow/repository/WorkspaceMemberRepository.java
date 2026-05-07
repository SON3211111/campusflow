package com.campusflow.repository;

import com.campusflow.entity.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, String> {
}