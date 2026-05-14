package com.campusflow.dto;
import lombok.Getter;
import lombok.Setter;

/** 로그인 요청 DTO (이메일 + 비밀번호) */
@Getter @Setter
public class LoginRequest {
    private String email;
    private String password;
}