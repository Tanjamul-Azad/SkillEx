package com.skillex.dto.session;

/** Request body for PATCH /api/sessions/{id}/notes */
public record UpdateNotesRequest(
    String notes
) {}
