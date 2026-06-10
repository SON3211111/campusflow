package com.campusflow.service;

import com.campusflow.entity.AiTaskSession;
import com.campusflow.repository.AiTaskSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AiTaskSessionService {

    private final AiTaskSessionRepository repo;

    @Transactional(readOnly = true)
    public Optional<String> getSession(String workspaceId) {
        return repo.findById(workspaceId).map(AiTaskSession::getSessionData);
    }

    @Transactional
    public void saveSession(String workspaceId, String sessionData, String userId) {
        AiTaskSession session = repo.findById(workspaceId)
                .orElseGet(() -> AiTaskSession.builder()
                        .workspaceId(workspaceId)
                        .createdBy(userId)
                        .build());
        session.setSessionData(sessionData);
        repo.save(session);
    }

    @Transactional
    public void deleteSession(String workspaceId) {
        repo.deleteById(workspaceId);
    }

    @Transactional(readOnly = true)
    public boolean hasSession(String workspaceId) {
        return repo.existsById(workspaceId);
    }
}
