package com.campusflow.repository;

import com.campusflow.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommunityPostRepository extends JpaRepository<CommunityPost, String> {
    // 모든 워크스페이스에서 발행된 도움 요청글을 최신 등록순으로 한눈에 모아보기
    List<CommunityPost> findAllByOrderByCreatedAtDesc();
}