package com.skillex.controller;

import com.skillex.dto.certificate.BadgeDto;
import com.skillex.dto.certificate.CertificateDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class CertificateController {
    private final CertificateService certificateService;

    @GetMapping("/api/certificates/me")
    public ApiResponse<List<CertificateDto>> mine(Authentication auth) {
        return ApiResponse.ok(certificateService.getMyCertificates(userId(auth)));
    }

    @GetMapping("/api/users/{userId}/certificates")
    public ApiResponse<List<CertificateDto>> userCertificates(@PathVariable String userId) {
        return ApiResponse.ok(certificateService.getUserCertificates(userId));
    }

    @GetMapping("/api/badges/me")
    public ApiResponse<List<BadgeDto>> myBadges(Authentication auth) {
        return ApiResponse.ok(certificateService.getUserBadges(userId(auth)));
    }

    @GetMapping("/api/users/{userId}/badges")
    public ApiResponse<List<BadgeDto>> userBadges(@PathVariable String userId) {
        return ApiResponse.ok(certificateService.getUserBadges(userId));
    }

    @GetMapping("/api/public/certificates/{code}")
    public ApiResponse<CertificateDto> publicCertificate(@PathVariable String code) {
        return ApiResponse.ok(certificateService.getPublicCertificate(code));
    }

    @GetMapping(value = "/api/public/badges/github/{userId}/{skillId}", produces = "image/svg+xml")
    public String githubBadge(@PathVariable String userId, @PathVariable String skillId) {
        return certificateService.githubBadgeSvg(userId, skillId);
    }

    @GetMapping(value = "/api/public/certificates/{code}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> certificatePdf(@PathVariable String code) {
        CertificateDto certificate = certificateService.getPublicCertificate(code);
        byte[] bytes = simplePdf("""
            SkillEX Verified Certificate
            Awarded to: %s
            Skill: %s
            Credential: %s
            Status: %s
            Issued: %s
            Verification: %s
            """.formatted(
            certificate.userName(),
            certificate.skillName(),
            certificate.title(),
            certificate.status(),
            certificate.issuedAt(),
            certificate.verificationUrl()
        ));
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                .filename("skillex-certificate-" + certificate.verificationCode() + ".pdf")
                .build()
                .toString())
            .body(bytes);
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }

    private byte[] simplePdf(String text) {
        String[] lines = text.lines().filter(line -> !line.isBlank()).toArray(String[]::new);
        StringBuilder content = new StringBuilder("BT /F1 18 Tf 72 760 Td ");
        for (int i = 0; i < lines.length; i++) {
            if (i == 1) content.append("/F1 24 Tf ");
            if (i == 2) content.append("/F1 14 Tf ");
            content.append("(").append(pdfEscape(lines[i])).append(") Tj ");
            content.append("0 -34 Td ");
        }
        content.append("ET");
        String stream = content.toString();
        String obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n";
        String obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n";
        String obj3 = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n";
        String obj4 = "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n";
        String obj5 = "5 0 obj << /Length " + stream.getBytes(StandardCharsets.ISO_8859_1).length + " >> stream\n" + stream + "\nendstream endobj\n";
        String[] objects = {obj1, obj2, obj3, obj4, obj5};
        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        int[] offsets = new int[objects.length + 1];
        for (int i = 0; i < objects.length; i++) {
            offsets[i + 1] = pdf.toString().getBytes(StandardCharsets.ISO_8859_1).length;
            pdf.append(objects[i]);
        }
        int xref = pdf.toString().getBytes(StandardCharsets.ISO_8859_1).length;
        pdf.append("xref\n0 6\n0000000000 65535 f \n");
        for (int i = 1; i <= objects.length; i++) {
            pdf.append(String.format("%010d 00000 n \n", offsets[i]));
        }
        pdf.append("trailer << /Size 6 /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF");
        return pdf.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private String pdfEscape(String value) {
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
