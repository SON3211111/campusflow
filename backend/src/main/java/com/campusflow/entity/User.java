package com.campusflow.entity;

import com.campusflow.entity.enums.UserRole;   // Enum 패키지 생성 권장
import com.campusflow.entity.enums.UserStatus; // Enum 패키지 생성 권장
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter  // Lombok 정상 작동 시 사용 (IntelliJ 설정 확인 필수)
@Builder         // 생성자 대신 객체 생성을 안전하게 함
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "user_id", length = 50)
    private String userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column
    private String password;

    @Enumerated(EnumType.STRING) // DB의 ENUM과 매핑 핵심!
    @Column(columnDefinition = "ENUM('STUDENT', 'PROFESSOR')")
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(columnDefinition = "ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'")
    private UserStatus status = UserStatus.ACTIVE;

    private String oauthProvider;

    private String oauthProviderId;

    private LocalDateTime lastLoginAt;

    private LocalDateTime deletedAt;

    @CreationTimestamp // INSERT 시 자동으로 현재 시간 저장
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // [핵심] 순환 참조 방지: 연관관계 편의 메서드와 DTO 사용을 권장하므로 @JsonIgnore는 유지하거나 제거 가능 (DTO 사용 시 불필요)
    @Builder.Default
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Workspace> workspaces = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.userId == null) {
            this.userId = java.util.UUID.randomUUID().toString();
        }
    }
}
