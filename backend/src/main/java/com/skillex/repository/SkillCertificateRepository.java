package com.skillex.repository;

import com.skillex.model.SkillCertificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SkillCertificateRepository extends JpaRepository<SkillCertificate, String> {
    List<SkillCertificate> findByUserIdOrderByIssuedAtDesc(String userId);
    List<SkillCertificate> findByUserIdAndStatusOrderByIssuedAtDesc(String userId, SkillCertificate.CertificateStatus status);
    Optional<SkillCertificate> findByVerificationCode(String verificationCode);
    Optional<SkillCertificate> findByUserIdAndSkillIdAndCertificateType(String userId, String skillId, SkillCertificate.CertificateType type);
    List<SkillCertificate> findByUserIdAndStatus(String userId, SkillCertificate.CertificateStatus status);
}
