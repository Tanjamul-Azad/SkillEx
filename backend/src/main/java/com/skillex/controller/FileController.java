package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;

@RestController
@RequestMapping("/api/upload")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);
    private static final long MAX_UPLOAD_BYTES = 5L * 1024L * 1024L;
    private static final long MAX_RESUME_UPLOAD_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
        "image/jpeg", ".jpg",
        "image/png", ".png",
        "image/webp", ".webp",
        "image/gif", ".gif"
    );

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("Upload attempt with empty file");
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, null, "Please select a file to upload."));
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ApiResponse<>(false, null, "File must be 5MB or smaller."));
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, null, "Only JPG, PNG, WebP, and GIF images are allowed."));
        }

        try {
            log.info("Processing file upload: {}, size: {} bytes", file.getOriginalFilename(), file.getSize());

            Path uploadPath = Paths.get(uploadDir, "images");
            if (!Files.exists(uploadPath)) {
                log.info("Creating upload directory: {}", uploadPath.toAbsolutePath());
                Files.createDirectories(uploadPath);
            }

            if (!hasExpectedImageSignature(file, contentType)) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, null, "Uploaded file content is not a supported image."));
            }

            String extension = EXTENSIONS_BY_CONTENT_TYPE.getOrDefault(contentType, ".img");

            String newFilename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(newFilename);
            log.info("Saving file to: {}", filePath.toAbsolutePath());

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/images/" + newFilename;
            log.info("File uploaded successfully: {}", fileUrl);

            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);

            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (IOException e) {
            log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
            return ResponseEntity.internalServerError().body(new ApiResponse<>(false, null, "Failed to upload file: " + e.getMessage()));
        }
    }

    @PostMapping("/resume")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadResume(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, null, "Please select a resume file to upload."));
        }
        if (file.getSize() > MAX_RESUME_UPLOAD_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ApiResponse<>(false, null, "Resume file must be 10MB or smaller."));
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!"application/pdf".equals(contentType)) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, null, "Only PDF resumes are allowed."));
        }

        try {
            Path uploadPath = Paths.get(uploadDir, "resumes");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            if (!hasPdfSignature(file)) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, null, "Uploaded resume is not a valid PDF."));
            }

            String newFilename = UUID.randomUUID() + ".pdf";
            Path filePath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/resumes/" + newFilename;
            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(new ApiResponse<>(false, null, "Failed to upload resume: " + e.getMessage()));
        }
    }

    private boolean hasExpectedImageSignature(MultipartFile file, String contentType) throws IOException {
        byte[] header;
        try (var stream = file.getInputStream()) {
            header = stream.readNBytes(16);
        }

        if ("image/jpeg".equals(contentType)) {
            return header.length >= 3
                && (header[0] & 0xFF) == 0xFF
                && (header[1] & 0xFF) == 0xD8
                && (header[2] & 0xFF) == 0xFF;
        }
        if ("image/png".equals(contentType)) {
            byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            return startsWith(header, png);
        }
        if ("image/gif".equals(contentType)) {
            return startsWith(header, "GIF87a".getBytes()) || startsWith(header, "GIF89a".getBytes());
        }
        if ("image/webp".equals(contentType)) {
            return header.length >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
        }
        return false;
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (value[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean hasPdfSignature(MultipartFile file) throws IOException {
        byte[] header;
        try (var stream = file.getInputStream()) {
            header = stream.readNBytes(5);
        }
        return header.length == 5
            && header[0] == '%'
            && header[1] == 'P'
            && header[2] == 'D'
            && header[3] == 'F'
            && header[4] == '-';
    }
}
