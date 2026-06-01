package com.campusflow.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class CommunityPostResponse {
    private String postId;
    private String title;
    private String content;
    private String authorId;
    private String authorName;
    private String workspaceName;
    private boolean isSolved;
    private LocalDateTime createdAt;
    private List<CommentDetail> comments;

    @Getter
    @AllArgsConstructor
    public static class CommentDetail {
        private String commentId;
        private String content;
        private String helperName;
        private boolean isAdopted;
        private LocalDateTime createdAt;
        private List<ReplyDetail> replies; // 💡 댓글 안의 대댓글 리스트 계층 구조
    }

    @Getter
    @AllArgsConstructor
    public static class ReplyDetail {
        private String commentId;
        private String content;
        private String helperName;
        private LocalDateTime createdAt;
    }
}