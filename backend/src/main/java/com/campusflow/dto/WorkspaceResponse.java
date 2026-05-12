package com.campusflow.dto;

import com.campusflow.entity.Workspace;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceResponse {
    private String workspaceId; // DB 설계에 따라 String
    private String name;
    private String type;

    public static WorkspaceResponse from(Workspace workspace) {
        if (workspace == null) return null;

        return WorkspaceResponse.builder()
                .workspaceId(workspace.getWorkspaceId()) // 여기서 반환 타입이 String이어야 함
                .name(workspace.getName())
                .type(workspace.getType() != null ? workspace.getType().name() : null)
                .build();
    }
}