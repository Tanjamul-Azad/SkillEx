package com.skillex.config;

import com.skillex.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Fails fast when the app is launched with a production profile and unsafe
 * demo/local defaults are still active.
 */
@Component
public class ProductionStartupGuard implements ApplicationRunner {

    private static final String LEAKED_AGORA_APP_ID = "bf8f5464ba264a64b2c1fe2ccb7a87c3";
    private static final String LEAKED_AGORA_CERTIFICATE = "c3218a61f792462d884d0c0b035d353e";

    private final Environment environment;
    private final UserRepository userRepository;

    public ProductionStartupGuard(Environment environment, UserRepository userRepository) {
        this.environment = environment;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isProductionProfile()) {
            return;
        }

        List<String> failures = new ArrayList<>();
        validateJwtSecret(failures);
        validateCors(failures);
        validateDatabase(failures);
        validateAgora(failures);
        validateDemoFlags(failures);
        validateDemoAccounts(failures);

        if (!failures.isEmpty()) {
            throw new IllegalStateException("Production safety check failed:\n - " + String.join("\n - ", failures));
        }
    }

    private boolean isProductionProfile() {
        boolean profileMatches = Arrays.stream(environment.getActiveProfiles())
            .map(profile -> profile.toLowerCase(Locale.ROOT))
            .anyMatch(profile -> profile.equals("prod") || profile.equals("production"));

        String appEnvironment = prop("app.environment", "");
        return profileMatches || "production".equalsIgnoreCase(appEnvironment);
    }

    private void validateJwtSecret(List<String> failures) {
        String secret = prop("app.jwt.secret", "");
        if (secret.isBlank() || secret.contains("CHANGE_THIS") || secret.length() < 32) {
            failures.add("APP_JWT_SECRET must be a real random secret with at least 32 characters.");
        }
    }

    private void validateCors(List<String> failures) {
        String origins = prop("app.cors.allowed-origins", "");
        String lowerOrigins = origins.toLowerCase(Locale.ROOT);
        if (origins.isBlank()) {
            failures.add("CORS_ALLOWED_ORIGINS must contain the real production frontend origin.");
        }
        if (origins.contains("*")) {
            failures.add("CORS_ALLOWED_ORIGINS must not use wildcards in production.");
        }
        if (lowerOrigins.contains("localhost") || lowerOrigins.contains("127.0.0.1")) {
            failures.add("CORS_ALLOWED_ORIGINS must not include localhost in production.");
        }
    }

    private void validateDatabase(List<String> failures) {
        String url = prop("spring.datasource.url", "");
        String password = prop("spring.datasource.password", "");
        String lowerUrl = url.toLowerCase(Locale.ROOT);

        if (url.isBlank()) {
            failures.add("DB_URL must be configured for production.");
        }
        if (lowerUrl.contains("localhost") || lowerUrl.contains("127.0.0.1")) {
            failures.add("DB_URL must not point to localhost in production.");
        }
        if (lowerUrl.contains("usessl=false")) {
            failures.add("DB_URL must not disable SSL in production.");
        }
        if (password.isBlank()) {
            failures.add("DB_PASSWORD must be configured for production.");
        }
    }

    private void validateAgora(List<String> failures) {
        String appId = prop("app.agora.app-id", "");
        String certificate = prop("app.agora.app-certificate", "");

        if (appId.isBlank()) {
            failures.add("AGORA_APP_ID must be configured for production live sessions.");
        }
        if (certificate.isBlank()) {
            failures.add("AGORA_APP_CERTIFICATE must be configured for production live sessions.");
        }
        if (LEAKED_AGORA_APP_ID.equals(appId) || LEAKED_AGORA_CERTIFICATE.equals(certificate)) {
            failures.add("Agora credentials match values that were previously committed; rotate them before production.");
        }
    }

    private void validateDemoFlags(List<String> failures) {
        if (Boolean.parseBoolean(prop("app.demo.seed.enabled", "false"))) {
            failures.add("APP_DEMO_SEED_ENABLED must be false in production.");
        }
    }

    private void validateDemoAccounts(List<String> failures) {
        if (userRepository.existsByEmailIgnoreCase("admin@skillex.app")) {
            failures.add("The demo admin account admin@skillex.app exists; remove or replace it before production.");
        }
        if (userRepository.countByEmailSuffix("@chain.demo") > 0) {
            failures.add("Demo chain users exist; remove showcase seed accounts before production.");
        }
    }

    private String prop(String key, String defaultValue) {
        return environment.getProperty(key, defaultValue);
    }
}
