package com.campusflow.controller;

import com.campusflow.dto.CommunityCommentRequest;
import com.campusflow.dto.CommunityPostRequest;
import com.campusflow.dto.CommunityPostResponse;
import com.campusflow.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
// 💡 슬래시(//) 주석으로 수정 완료! Origins 주소는 현재 테스트 환경에 맞춰 자유롭게 조절하세요
@CrossOrigin(origins = "http://localhost:3000")
public class CommunityController {

    private final CommunityService communityService;

    // A. 각 팀 프로젝트 워크스페이스 방에서 쏘아 올린 SOS 생성 받아주기
    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody CommunityPostRequest request) {
        communityService.createPost(request);
        return ResponseEntity.ok().body("{\"message\": \"도움 광장에 SOS 요청이 성공적으로 등록되었습니다.\"}");
    }

    // B. 전체 도움 요청글 모아보기 리스트 조회 (광장 메인 화면)
    @GetMapping
    public ResponseEntity<List<CommunityPostResponse>> getAllPosts() {
        return ResponseEntity.ok(communityService.getAllPosts());
    }

    // C. SOS 게시글 정밀 상세 보기 (대댓글 계층 구조가 하위에 포함되어 출력됨)
    @GetMapping("/{postId}")
    public ResponseEntity<CommunityPostResponse> getPostDetail(@PathVariable String postId) {
        return ResponseEntity.ok(communityService.getPostDetail(postId));
    }

    // D. 도움 요청글 파기 철회 (글 삭제)
    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable String postId) {
        communityService.deletePost(postId);
        return ResponseEntity.ok().body("{\"message\": \"도움 요청글 철회 완료\"}");
    }

    // E. 헬퍼 팀원의 답변 코멘트(댓글/대댓글 겸용) 등록
    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String postId,
            @RequestBody CommunityCommentRequest request) {

        communityService.addComment(postId, request);
        return ResponseEntity.ok().body("{\"message\": \"댓글/대댓글 등록 성공\"}");
    }

    // F. 댓글 또는 대댓글 개별 파기 (삭제)
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable String commentId) {
        communityService.deleteComment(commentId);
        return ResponseEntity.ok().body("{\"message\": \"댓글이 삭제되었습니다.\"}");
    }
}