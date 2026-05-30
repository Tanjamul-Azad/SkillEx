package com.skillex.repository;

import com.skillex.model.UserCreditWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserCreditWalletRepository extends JpaRepository<UserCreditWallet, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from UserCreditWallet w where w.user.id = :userId")
    Optional<UserCreditWallet> findByUserIdForUpdate(@Param("userId") String userId);
}
