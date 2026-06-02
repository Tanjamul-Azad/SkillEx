package com.skillex.repository;

import com.skillex.model.EventRsvp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRsvpRepository extends JpaRepository<EventRsvp, EventRsvp.EventRsvpId> {

    long countByEvent_IdAndState(String eventId, EventRsvp.RsvpState state);

    @Query("""
        SELECT r.user.id
        FROM EventRsvp r
        WHERE r.event.id = :eventId
          AND r.state IN :states
        """)
    List<String> findUserIdsByEventAndStates(
        @Param("eventId") String eventId,
        @Param("states") List<EventRsvp.RsvpState> states
    );
}
