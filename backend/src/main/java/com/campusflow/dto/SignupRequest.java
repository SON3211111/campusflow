package com.campusflow.dto;
import lombok.Getter;
import lombok.Setter;
import com.campusflow.entity.enums.UserRole;

@Getter @Setter
public class SignupRequest {
    private String email;
    private String password;
    private String name;
    private UserRole role;
}