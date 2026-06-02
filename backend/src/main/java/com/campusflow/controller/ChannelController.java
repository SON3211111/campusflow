package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.ChannelResponse;
import com.campusflow.service.ChannelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChannelResponse>>> getChannels(@PathVariable String workspaceId) {
        return ResponseEntity.ok(ApiResponse.success(200, "조회 성공", channelService.getChannels(workspaceId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChannelResponse>> createChannel(
            @PathVariable String workspaceId,
            @RequestBody Map<String, String> body) {
        ChannelResponse created = channelService.createChannel(
                workspaceId,
                body.get("name"),
                body.get("createdByUserId")
        );
        return ResponseEntity.ok(ApiResponse.success(200, "채널 생성 완료", created));
    }

    @DeleteMapping("/{channelId}")
    public ResponseEntity<ApiResponse<Void>> deleteChannel(@PathVariable String channelId) {
        channelService.deleteChannel(channelId);
        return ResponseEntity.ok(ApiResponse.success(200, "채널 삭제 완료"));
    }
}
