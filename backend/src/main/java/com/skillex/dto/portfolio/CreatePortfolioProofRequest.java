package com.skillex.dto.portfolio;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePortfolioProofRequest(
    String skillId,
    @NotBlank @Size(max = 140) String title,
    @Size(max = 1200) String description,
    @NotBlank @Pattern(regexp = "PROJECT|GITHUB|BEHANCE|CERTIFICATE|SESSION_OUTCOME|MEDIA|OTHER") String proofType,
    @Size(max = 600) String url,
    @Size(max = 600) String mediaUrl,
    String sourceSessionId,
    @Pattern(regexp = "PUBLIC|PRIVATE") String visibility,
    Boolean featured
) {}
