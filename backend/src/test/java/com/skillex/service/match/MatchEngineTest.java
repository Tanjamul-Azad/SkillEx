package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchEngineTest {

    @Mock
    private BasicMatchStrategy basicMatchStrategy;

    @Mock
    private SmartMatchStrategy smartMatchStrategy;

    @InjectMocks
    private MatchEngine matchEngine;

    @Test
    void shouldUseSmartStrategyByDefault() {
        UUID userId = UUID.randomUUID();
        when(smartMatchStrategy.findMatches(userId, 5)).thenReturn(List.of());

        List<MatchUserDto> result = matchEngine.run(userId, 5);

        assertEquals(0, result.size());
    }

    @Test
    void shouldUseBasicStrategyWhenRequested() {
        UUID userId = UUID.randomUUID();
        when(basicMatchStrategy.findMatches(userId, 3)).thenReturn(List.of());

        List<MatchUserDto> result = matchEngine.run(userId, 3, MatchEngine.StrategyType.BASIC);

        assertEquals(0, result.size());
    }
}
