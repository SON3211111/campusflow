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
    private String workspaceId;
    private String name;
    private String type;
    private String gradient;

    public static WorkspaceResponse from(Workspace workspace) {
        if (workspace == null) return null;

        return WorkspaceResponse.builder()
                .workspaceId(workspace.getWorkspaceId())
                .name(workspace.getName())
                .type(workspace.getType() != null ? workspace.getType().name() : null)
                .gradient(workspace.getGradient())
                .build();
    }
}