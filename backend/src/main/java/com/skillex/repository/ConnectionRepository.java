package com.skillex.repository;

import com.skillex.model.Connection;
import com.skillex.model.Connection.ConnectionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, String> {

    Page<Connection> findByRequesterId(String requesterId, Pageable pageable);

    Page<Connection> findByReceiverId(String receiverId, Pageable pageable);

    Page<Connection> findByRequesterIdOrReceiverId(String requesterId, String receiverId, Pageable pageable);

    Page<Connection> findByRequesterIdOrReceiverIdAndStatus(
        String requesterId,
        String receiverId,
        ConnectionStatus status,
        Pageable pageable
    );

    Page<Connection> findByRequesterIdAndStatus(String requesterId, ConnectionStatus status, Pageable pageable);

    Page<Connection> findByReceiverIdAndStatus(String receiverId, ConnectionStatus status, Pageable pageable);

    long countByReceiverIdAndStatus(String receiverId, ConnectionStatus status);

    @Query("""
        SELECT CASE WHEN c.requester.id = :userId THEN c.receiver.id ELSE c.requester.id END
        FROM Connection c
        WHERE (c.requester.id = :userId OR c.receiver.id = :userId)
          AND c.status = :status
        """)
    List<String> findConnectedUserIds(@Param("userId") String userId, @Param("status") ConnectionStatus status);

    @Query("""
        SELECT c FROM Connection c
        WHERE ((c.requester.id = :userA AND c.receiver.id = :userB)
            OR (c.requester.id = :userB AND c.receiver.id = :userA))
        ORDER BY c.createdAt DESC
        """)
    List<Connection> findPairHistory(
        @Param("userA") String userA,
        @Param("userB") String userB,
        Pageable pageable
    );

    @Query("""
        SELECT c FROM Connection c
        WHERE ((c.requester.id = :userA AND c.receiver.id = :userB)
            OR (c.requester.id = :userB AND c.receiver.id = :userA))
          AND c.status IN :statuses
        ORDER BY c.createdAt DESC
        """)
    List<Connection> findPairByStatuses(
        @Param("userA") String userA,
        @Param("userB") String userB,
        @Param("statuses") Collection<ConnectionStatus> statuses,
        Pageable pageable
    );
}
