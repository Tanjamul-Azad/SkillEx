package com.skillex.repository;

import com.skillex.model.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {

    Page<Event> findByEventDateAfterOrderByEventDateAsc(LocalDateTime from, Pageable pageable);

    Page<Event> findByHostId(String hostId, Pageable pageable);
}
