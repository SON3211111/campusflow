package com.campusflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class WithdrawRequest {
    private String password; // 탈퇴 확인용 비밀번호
}