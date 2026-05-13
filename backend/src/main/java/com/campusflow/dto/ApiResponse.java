package com.campusflow.dto;

import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // 외부에서 기본 생성자 호출 방지 (안전성)
@AllArgsConstructor // 모든 필드를 인자로 받는 생성자 자동 생성
@Builder // 빌더 패턴 적용
public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;

    /**
     * 성공 응답 생성 (Static Factory Method)
     */
    public static <T> ApiResponse<T> success(int status, String message, T data) {
        return ApiResponse.<T>builder()
                .status(status)
                .message(message)
                .data(data)
                .build();
    }

    /**
     * 데이터가 없는 성공 응답 (오버로딩)
     */
    public static <T> ApiResponse<T> success(int status, String message) {
        return success(status, message, null);
    }

    /**
     * 에러 응답 생성
     */
    public static <T> ApiResponse<T> error(int status, String message) {
        return ApiResponse.<T>builder()
                .status(status)
                .message(message)
                .data(null)
                .build();
    }
}