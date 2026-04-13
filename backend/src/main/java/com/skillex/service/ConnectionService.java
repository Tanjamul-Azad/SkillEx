package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.connection.ConnectionDto;
import com.skillex.dto.connection.ConnectionRelationshipDto;
import com.skillex.dto.connection.CreateConnectionRequest;
import com.skillex.dto.connection.UpdateConnectionRequest;

/** Contract for dedicated social connection handshake flow. */
public interface ConnectionService {

    ConnectionDto create(String requesterId, CreateConnectionRequest req);

    PagedResponse<ConnectionDto> listForUser(String userId, String status, String direction, int page, int size);

    ConnectionDto updateStatus(String connectionId, String actingUserId, UpdateConnectionRequest req);

    ConnectionRelationshipDto getRelationship(String userId, String targetUserId);

    long countIncomingPending(String userId);
}
