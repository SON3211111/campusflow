package com.campusflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing // [추가] 엔티티의 @CreationTimestamp, @CreatedDate 등을 활성화
@SpringBootApplication
public class CampusflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(CampusflowApplication.class, args);
	}

}