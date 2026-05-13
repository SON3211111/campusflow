package com.campusflow.dto;
import lombok.Getter;
import lombok.Setter;
import com.campusflow.entity.enums.WorkspaceType;

@Getter @Setter
public class WorkspaceRequest {
    private String name;
    private WorkspaceType type;
    private String description;
    private String userId; // 생성자 ID
}