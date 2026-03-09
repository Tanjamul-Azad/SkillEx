package com.skillex.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Jackson ObjectMapper configuration.
 *
 * Problems solved:
 *  1. Hibernate lazy-proxy serialization — Hibernate6Module initializes lazy
 *     associations that are already loaded and serializes unloaded ones as null
 *     (instead of throwing LazyInitializationException or infinite recursion).
 *  2. Java time — JavaTimeModule writes LocalDateTime as ISO-8601 strings.
 *  3. Unknown properties — ignored so forward-compatible clients don't break.
 *  4. Empty Hibernate proxy beans — fail-on-empty disabled to prevent 500s.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // ── Java Time (LocalDateTime → ISO-8601) ──────────────────────────────
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // ── Hibernate lazy-loading ────────────────────────────────────────────
        Hibernate6Module hibernateModule = new Hibernate6Module();
        // Serialize initialized associations; leave uninitialized ones as null
        hibernateModule.configure(
            Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        hibernateModule.configure(
            Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true);
        mapper.registerModule(hibernateModule);

        // ── Resilience ────────────────────────────────────────────────────────
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

        return mapper;
    }
}
