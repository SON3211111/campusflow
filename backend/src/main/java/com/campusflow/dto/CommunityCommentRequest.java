package com.campusflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CommunityCommentRequest {
    private String content;
    private String userId;
    private String parentCommentId; // 대댓글일 때만 부모 ID 채워서 전송, 일반 댓글은 null
}