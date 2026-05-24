package com.skillex.repository;

import com.skillex.model.CreditTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, String> {
    Page<CreditTransaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
