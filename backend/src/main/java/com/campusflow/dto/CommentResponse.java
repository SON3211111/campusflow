package com.campusflow.dto;

import com.campusflow.entity.TeamCommunication;

public record CommentResponse(
        String messageId,
        String senderId,
        String senderName,
        String content,
        String channel,
        String mentionList,
        String createdAt
) {
    public static CommentResponse from(TeamCommunication tc) {
        return new CommentResponse(
                tc.getMessageId(),
                tc.getSender().getUserId(),
                tc.getSender().getName(),
                tc.getContent(),
                tc.getChannel(),
                tc.getMentionList(),
                tc.getCreatedAt().toString()
        );
    }
}
