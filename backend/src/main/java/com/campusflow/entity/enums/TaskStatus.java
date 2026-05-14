package com.campusflow.entity.enums;

/**
 * 태스크 상태 Enum (칸반 보드 컬럼에 매핑)
 * TODO: 상태없음 | REVIEW: 시작하지않음 | DOING: 진행중 | ISSUE: 보류중 | DONE: 완료
 */
public enum TaskStatus {
    TODO, DOING, ISSUE, REVIEW, DONE
}