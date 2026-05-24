package com.skillex.dto.ai;

import java.util.List;

public record AiHelperResponse(
    String contextType,
    String response,
    List<String> suggestedActions,
    String safetyNote
) {}
