package com.campusflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CommunityPostRequest {
    private String title;
    private String content;
    private String userId;
    private String workspaceId;
}