package com.campusflow.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor // 기본 생성자 필수
@Builder
public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;

    // 명시적 생성자 추가 (컴파일러 추론 에러 방지)
    public ApiResponse(int status, String message, T data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(int status, String message, T data) {
        // 명시적으로 타입을 지정해줍니다 <T>
        return new ApiResponse<T>(status, message, data);
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        // 명시적으로 타입을 지정해줍니다 <T>
        return new ApiResponse<T>(status, message, null);
    }
}