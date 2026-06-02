package com.campusflow.dto;

import com.campusflow.entity.Channel;

public record ChannelResponse(
        String channelId,
        String name,
        boolean isDefault,
        String createdAt
) {
    public static ChannelResponse from(Channel c) {
        return new ChannelResponse(
                c.getChannelId(),
                c.getName(),
                c.isDefault(),
                c.getCreatedAt().toString()
        );
    }
}
