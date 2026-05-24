package com.skillex.repository;

import com.skillex.model.CertificateEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificateEventRepository extends JpaRepository<CertificateEvent, String> {
}
