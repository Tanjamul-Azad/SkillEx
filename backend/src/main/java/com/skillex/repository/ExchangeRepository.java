package com.skillex.repository;

import com.skillex.model.Exchange;
import com.skillex.model.Exchange.ExchangeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExchangeRepository extends JpaRepository<Exchange, String> {

    Page<Exchange> findByRequesterId(String requesterId, Pageable pageable);

    Page<Exchange> findByReceiverId(String receiverId, Pageable pageable);

    Page<Exchange> findByRequesterIdOrReceiverId(String requesterId, String receiverId, Pageable pageable);

    Page<Exchange> findByRequesterIdAndStatus(String requesterId, ExchangeStatus status, Pageable pageable);

    Page<Exchange> findByReceiverIdAndStatus(String receiverId, ExchangeStatus status, Pageable pageable);

    boolean existsByRequesterIdAndReceiverIdAndStatus(String requesterId, String receiverId, ExchangeStatus status);

    java.util.Optional<Exchange> findFirstByRequesterIdAndReceiverIdAndStatusOrderByCreatedAtDesc(
        String requesterId,
        String receiverId,
        ExchangeStatus status
    );

    /** Total exchanges the user has ever initiated (any status). */
    long countByRequesterId(String requesterId);

    /** Total exchanges the user has ever received (any status). */
    long countByReceiverId(String receiverId);

    @Query("SELECT e FROM Exchange e WHERE (e.requester.id = :userId OR e.receiver.id = :userId) AND e.status = :status")
    Page<Exchange> findByRequesterIdOrReceiverIdAndStatus(
        @Param("userId") String userId1,
        @Param("userId") String userId2,
        @Param("status") ExchangeStatus status,
        Pageable pageable);

    @Query("SELECT COUNT(e) FROM Exchange e WHERE (e.requester.id = :userId OR e.receiver.id = :userId) AND e.status = :status")
    long countByRequesterIdOrReceiverIdAndStatus(
        @Param("userId") String userId,
        @Param("userId") String userId2,
        @Param("status") ExchangeStatus status);
}
