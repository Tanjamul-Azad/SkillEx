package com.skillex.service;

import com.skillex.model.SessionTranscript;
import com.skillex.model.SessionTranscript.SpeakerRole;
import com.skillex.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptProcessor {

    private final TranscriptService transcriptService;
    private final SessionRepository sessionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    /**
     * Asynchronously transcribes uploaded voice audio using Whisper when an API key is configured.
     * The primary free path is browser speech recognition through /transcribe/text.
     * Thread name: "transcript-" (configured in AsyncConfig).
     */
    @Async("transcriptExecutor")
    public void processAudioChunk(String sessionId, String speakerUserId, SpeakerRole role, MultipartFile audioFile) {
        log.info("[Transcript] Thread '{}' started processing chunk for session: {}", Thread.currentThread().getName(), sessionId);
        
        String transcribedText;

        if (openAiApiKey == null || openAiApiKey.isBlank() || openAiApiKey.equals("your_openai_api_key_here")) {
            log.info("[Transcript] Audio upload transcription skipped because no Whisper API key is configured. Browser live transcription remains available.");
            return;
        } else {
            transcribedText = callWhisperApi(audioFile);
        }

        if (transcribedText != null && !transcribedText.isBlank()) {
            // Save chunk to database
            SessionTranscript saved = transcriptService.saveTranscriptChunk(sessionId, speakerUserId, role, transcribedText);
            String speakerName = sessionRepository.findById(sessionId)
                    .map(session -> {
                        if (session.getTeacher() != null && saved.getSpeakerUserId().equals(session.getTeacher().getId())) {
                            return session.getTeacher().getName();
                        }
                        if (session.getLearner() != null && saved.getSpeakerUserId().equals(session.getLearner().getId())) {
                            return session.getLearner().getName();
                        }
                        return saved.getSpeakerRole() == SpeakerRole.TEACHER ? "Teacher" : "Learner";
                    })
                    .orElse(saved.getSpeakerRole() == SpeakerRole.TEACHER ? "Teacher" : "Learner");

            // Broadcast real-time transcript payload over WS
            String destination = "/topic/session/" + sessionId + "/transcript";
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("id", saved.getId());
            payload.put("speakerUserId", saved.getSpeakerUserId());
            payload.put("speakerRole", saved.getSpeakerRole().toString());
            payload.put("speakerName", speakerName);
            payload.put("content", saved.getContent());
            payload.put("spokenAt", saved.getSpokenAt().toString());
            if (saved.getConfidenceScore() != null) {
                payload.put("confidenceScore", saved.getConfidenceScore());
            }
            if (saved.getDetectedLanguage() != null && !saved.getDetectedLanguage().isBlank()) {
                payload.put("detectedLanguage", saved.getDetectedLanguage());
            }
            messagingTemplate.convertAndSend(destination, payload);
            log.info("[Transcript] Successfully broadcasted transcribed chunk over WebSockets to {}", destination);
        }
    }

    private String callWhisperApi(MultipartFile audioFile) {
        try {
            byte[] bytes = audioFile.getBytes();
            String filename = audioFile.getOriginalFilename();
            if (filename == null || filename.isBlank()) {
                filename = "audio.webm";
            }
            String contentType = audioFile.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }
            String boundary = "Boundary-" + System.currentTimeMillis();
            
            // Construct HTTP Multipart Form Body
            byte[] multipartBody = createMultipartBody(bytes, filename, contentType, boundary);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/audio/transcriptions"))
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(multipartBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                // Parse simple JSON e.g. {"text": "hello world"}
                String body = response.body();
                int idx = body.indexOf("\"text\":");
                if (idx != -1) {
                    String sub = body.substring(idx + 8);
                    return sub.substring(0, sub.indexOf("\"")).replace("\\n", " ").trim();
                }
                return body;
            } else {
                log.error("[Whisper] Error response code: {}, body: {}", response.statusCode(), response.body());
                return "[Whisper API Error: " + response.statusCode() + "]";
            }
        } catch (Exception e) {
            log.error("[Whisper] Failed to call Whisper API.", e);
            return null;
        }
    }

    private byte[] createMultipartBody(byte[] fileBytes, String filename, String contentType, String boundary) throws Exception {
        String CRLF = "\r\n";
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        
        // Write model field
        bos.write(("--" + boundary + CRLF).getBytes());
        bos.write(("Content-Disposition: form-data; name=\"model\"" + CRLF + CRLF).getBytes());
        bos.write(("whisper-1" + CRLF).getBytes());
        
        // Write file field
        bos.write(("--" + boundary + CRLF).getBytes());
        bos.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"" + CRLF).getBytes());
        bos.write(("Content-Type: " + contentType + CRLF + CRLF).getBytes());
        bos.write(fileBytes);
        bos.write(CRLF.getBytes());
        
        // End multipart
        bos.write(("--" + boundary + "--" + CRLF).getBytes());
        return bos.toByteArray();
    }
}
