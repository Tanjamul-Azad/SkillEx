package com.skillex.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Verifies Firebase ID tokens and extracts the Google user profile.
 */
@Component
public class FirebaseTokenVerifier {

    private static final String APP_NAME = "skillex-firebase-auth";

    @Value("${app.firebase.google.enabled:false}")
    private boolean firebaseGoogleEnabled;

    @Value("${app.firebase.project-id:}")
    private String projectId;

    @Value("${app.firebase.service-account-json:}")
    private String serviceAccountJson;

    @Value("${app.firebase.service-account-path:}")
    private String serviceAccountPath;

    private FirebaseApp firebaseApp;

    public VerifiedFirebaseUser verifyGoogleIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Firebase ID token is required.");
        }

        if (!firebaseGoogleEnabled) {
            throw new IllegalStateException("Firebase Google authentication is disabled on the backend.");
        }

        FirebaseToken decodedToken;
        try {
            decodedToken = FirebaseAuth.getInstance(getOrCreateApp()).verifyIdToken(idToken, true);
        } catch (FirebaseAuthException ex) {
            throw new IllegalArgumentException("Invalid Firebase ID token.");
        }

        String email = decodedToken.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Google account email is required.");
        }

        if (!decodedToken.isEmailVerified()) {
            throw new IllegalArgumentException("Google account email is not verified.");
        }

        String provider = extractSignInProvider(decodedToken.getClaims());
        if (!"google.com".equals(provider)) {
            throw new IllegalArgumentException("Only Google sign-in is supported for this endpoint.");
        }

        String name = asString(decodedToken.getClaims().get("name"));
        String picture = asString(decodedToken.getClaims().get("picture"));
        return new VerifiedFirebaseUser(email, name, picture);
    }

    private synchronized FirebaseApp getOrCreateApp() {
        if (firebaseApp != null) {
            return firebaseApp;
        }

        FirebaseApp existing = FirebaseApp.getApps().stream()
            .filter(app -> APP_NAME.equals(app.getName()))
            .findFirst()
            .orElse(null);

        if (existing != null) {
            firebaseApp = existing;
            return existing;
        }

        try {
            GoogleCredentials credentials = resolveCredentials();
            FirebaseOptions.Builder builder = FirebaseOptions.builder().setCredentials(credentials);

            if (projectId != null && !projectId.isBlank()) {
                builder.setProjectId(projectId);
            }

            firebaseApp = FirebaseApp.initializeApp(builder.build(), APP_NAME);
            return firebaseApp;
        } catch (IOException ex) {
            throw new IllegalStateException("Firebase service account configuration is invalid.");
        }
    }

    private GoogleCredentials resolveCredentials() throws IOException {
        if (serviceAccountJson != null && !serviceAccountJson.isBlank()) {
            byte[] bytes = serviceAccountJson.getBytes(StandardCharsets.UTF_8);
            return GoogleCredentials.fromStream(new ByteArrayInputStream(bytes));
        }

        if (serviceAccountPath != null && !serviceAccountPath.isBlank()) {
            try (FileInputStream stream = new FileInputStream(serviceAccountPath)) {
                return GoogleCredentials.fromStream(stream);
            }
        }

        throw new IllegalStateException("Firebase service account is not configured.");
    }

    @SuppressWarnings("unchecked")
    private String extractSignInProvider(Map<String, Object> claims) {
        Object firebaseClaim = claims.get("firebase");
        if (!(firebaseClaim instanceof Map<?, ?> firebaseMap)) {
            return null;
        }

        Object provider = ((Map<String, Object>) firebaseMap).get("sign_in_provider");
        return asString(provider);
    }

    private String asString(Object value) {
        return value instanceof String str && !str.isBlank() ? str : null;
    }

    public record VerifiedFirebaseUser(String email, String name, String picture) {}
}
