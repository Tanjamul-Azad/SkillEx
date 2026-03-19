package com.skillex.service.embedding;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Primary embedding provider that supports runtime selection and safe fallback.
 *
 * <p>Config:
 * <ul>
 *   <li>{@code app.embedding.provider=api|local}</li>
 *   <li>{@code app.embedding.fallback-to-local=true|false}</li>
 * </ul>
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class AdaptiveTextEmbeddingProvider implements TextEmbeddingProvider {

    private final HashingTextEmbeddingProvider localProvider;
    private final GeminiApiTextEmbeddingProvider apiProvider;

    @Value("${app.embedding.provider:local}")
    private String providerMode;

    @Value("${app.embedding.fallback-to-local:true}")
    private boolean fallbackToLocal;

    /**
     * Once API embedding fails in a running process, pin to local to keep model
     * metadata and vector dimensions consistent across the refresh cycle.
     */
    private volatile boolean forceLocalUntilRestart = false;

    @PostConstruct
    public void logEmbeddingMode() {
        if ("api".equalsIgnoreCase(providerMode) && !apiProvider.isConfigured()) {
            log.warn("[Embedding] app.embedding.provider=api but no API key configured. Falling back to local embeddings.");
            return;
        }
        log.info("[Embedding] Provider mode={}, fallback-to-local={}", providerMode, fallbackToLocal);
    }

    @Override
    public String modelName() {
        if (useApi()) return apiProvider.modelName();
        return localProvider.modelName();
    }

    @Override
    public int dimensions() {
        if (useApi()) return apiProvider.dimensions();
        return localProvider.dimensions();
    }

    @Override
    public double[] embed(String text) {
        if (useApi()) {
            try {
                return apiProvider.embed(text);
            } catch (Exception ex) {
                if (!fallbackToLocal) throw ex;
                forceLocalUntilRestart = true;
                log.warn("[Embedding] API embed failed, falling back to local model: {}", ex.getMessage());
                return localProvider.embed(text);
            }
        }
        return localProvider.embed(text);
    }

    private boolean useApi() {
        return !forceLocalUntilRestart
            && "api".equalsIgnoreCase(providerMode)
            && apiProvider.isConfigured();
    }
}
