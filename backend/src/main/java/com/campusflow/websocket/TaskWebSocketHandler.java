package com.campusflow.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TaskWebSocketHandler extends TextWebSocketHandler {

    // workspaceId -> 연결된 세션 목록
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String workspaceId = getWorkspaceId(session);
        if (workspaceId != null) {
            rooms.computeIfAbsent(workspaceId, k -> ConcurrentHashMap.newKeySet()).add(session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String workspaceId = getWorkspaceId(session);
        if (workspaceId != null) {
            Set<WebSocketSession> room = rooms.get(workspaceId);
            if (room != null) room.remove(session);
        }
    }

    public void broadcast(String workspaceId, String jsonMessage) {
        Set<WebSocketSession> room = rooms.get(workspaceId);
        if (room == null) return;
        for (WebSocketSession s : room) {
            if (s.isOpen()) {
                try {
                    s.sendMessage(new TextMessage(jsonMessage));
                } catch (IOException e) {
                    // 전송 실패 세션은 무시
                }
            }
        }
    }

    private String getWorkspaceId(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null) return null;
        String query = uri.getQuery(); // "workspaceId=xxx"
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=");
            if (kv.length == 2 && "workspaceId".equals(kv[0])) return kv[1];
        }
        return null;
    }
}
