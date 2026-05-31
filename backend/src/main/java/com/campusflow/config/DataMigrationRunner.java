package com.campusflow.config;

import com.campusflow.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataMigrationRunner implements ApplicationRunner {

    private final TaskRepository taskRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int updated = taskRepository.backfillCreatedAt(LocalDateTime.now());
        if (updated > 0) {
            log.info("[Migration] createdAt null 태스크 {}건 업데이트 완료", updated);
        }
    }
}
