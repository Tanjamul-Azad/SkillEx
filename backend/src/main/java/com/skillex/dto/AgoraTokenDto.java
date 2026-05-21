package com.skillex.dto;

public record AgoraTokenDto(
    String token,
    int uid,
    String channelName
) {}
