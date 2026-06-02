package com.campusflow.dto;

import com.campusflow.entity.TeamCommunication;

public record CommentResponse(
        String messageId,
        String senderId,
        String senderName,
        String content,
        String channel,
        String mentionList,
        String createdAt,
        String parentMessageId,
        String parentSenderName,
        String parentContent
) {
    public static CommentResponse from(TeamCommunication tc) {
        TeamCommunication parent = tc.getParentMessage();
        return new CommentResponse(
                tc.getMessageId(),
                tc.getSender().getUserId(),
                tc.getSender().getName(),
                tc.getContent(),
                tc.getChannel(),
                tc.getMentionList(),
                tc.getCreatedAt().toString(),
                parent != null ? parent.getMessageId() : null,
                parent != null && parent.getSender() != null ? parent.getSender().getName() : null,
                parent != null ? parent.getContent() : null
        );
    }
}
