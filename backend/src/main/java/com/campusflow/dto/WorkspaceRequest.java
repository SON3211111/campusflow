package com.campusflow.dto;
import lombok.Getter;
import lombok.Setter;
import com.campusflow.entity.enums.WorkspaceType;

/** 워크스페이스 생성/수정 요청 DTO */
@Getter @Setter
public class WorkspaceRequest {
    private String name;
    private WorkspaceType type;
    private String description;
    private String gradient;
    private String userId;
}