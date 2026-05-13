package com.campusflow.repository;

import com.campusflow.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    // 특정 워크스페이스의 1차 분업(최상위 태스크)만 조회
    List<Task> findAllByWorkspace_WorkspaceIdAndParentTaskIsNull(String workspaceId);

    // 워크스페이스 삭제 시 관련 태스크 일괄 삭제
    void deleteAllByWorkspace_WorkspaceId(String workspaceId);
}