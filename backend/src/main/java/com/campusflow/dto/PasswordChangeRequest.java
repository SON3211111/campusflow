package com.campusflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class PasswordChangeRequest {
    private String current; // 프론트의 pwForm.current
    private String next;    // 프론트의 pwForm.next
    private String confirm; // 프론트의 pwForm.confirm
}