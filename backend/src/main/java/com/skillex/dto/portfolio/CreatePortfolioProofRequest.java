package com.skillex.dto.portfolio;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePortfolioProofRequest(
    String skillId,
    @NotBlank @Size(max = 140) String title,
    @Size(max = 1200) String description,
    @NotBlank @Pattern(regexp = "PROJECT|GITHUB|BEHANCE|CERTIFICATE|SESSION_OUTCOME|MEDIA|OTHER") String proofType,
    @Size(max = 600) @Pattern(regexp = "^$|https?://.+", message = "URL must start with http:// or https://") String url,
    @Size(max = 600) @Pattern(regexp = "^$|https?://.+", message = "Media URL must start with http:// or https://") String mediaUrl,
    String sourceSessionId,
    @Pattern(regexp = "PUBLIC|PRIVATE") String visibility,
    Boolean featured
) {}
