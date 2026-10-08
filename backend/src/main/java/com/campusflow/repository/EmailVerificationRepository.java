package com.campusflow.repository;
import com.campusflow.entity.EmailVerification;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface EmailVerificationRepository extends JpaRepository<EmailVerification,String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from EmailVerification e where e.email = :email")
    Optional<EmailVerification> lockByEmail(@org.springframework.data.repository.query.Param("email") String email);
}
