package com.campusflow.service;

import com.campusflow.dto.ChannelResponse;
import com.campusflow.entity.Channel;
import com.campusflow.entity.User;
import com.campusflow.entity.Workspace;
import com.campusflow.repository.ChannelRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ChannelResponse> getChannels(String workspaceId) {
        ensureDefaultChannel(workspaceId);
        return channelRepository.findAllByWorkspace_WorkspaceIdOrderByCreatedAtAsc(workspaceId)
                .stream()
                .map(ChannelResponse::from)
                .toList();
    }

    @Transactional
    public ChannelResponse createChannel(String workspaceId, String name, String createdByUserId) {
        if (channelRepository.existsByWorkspace_WorkspaceIdAndName(workspaceId, name)) {
            throw new IllegalArgumentException("이미 존재하는 채널명입니다: " + name);
        }
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스를 찾을 수 없습니다."));
        User creator = userRepository.findById(createdByUserId).orElse(null);

        Channel channel = Channel.builder()
                .workspace(workspace)
                .name(name)
                .createdBy(creator)
                .isDefault(false)
                .build();

        return ChannelResponse.from(channelRepository.save(channel));
    }

    @Transactional
    public void deleteChannel(String channelId) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new IllegalArgumentException("채널을 찾을 수 없습니다."));
        if (channel.isDefault()) {
            throw new IllegalArgumentException("기본 채널은 삭제할 수 없습니다.");
        }
        channelRepository.delete(channel);
    }

    // 워크스페이스에 기본 채널 없으면 생성
    private void ensureDefaultChannel(String workspaceId) {
        if (!channelRepository.existsByWorkspace_WorkspaceIdAndName(workspaceId, "일반")) {
            workspaceRepository.findByWorkspaceId(workspaceId).ifPresent(ws ->
                channelRepository.save(Channel.builder()
                        .workspace(ws)
                        .name("일반")
                        .isDefault(true)
                        .build())
            );
        }
    }
}
