package com.skillex.service;

import com.skillex.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginAttemptServiceTest {

    /** 3 failures within the window blocks; long block so timing is deterministic. */
    private LoginAttemptService service() {
        return new LoginAttemptService(3, 900, 900);
    }

    @Test
    void doesNotBlockBelowThreshold() {
        LoginAttemptService service = service();
        service.recordFailure("1.2.3.4");
        service.recordFailure("1.2.3.4");

        assertDoesNotThrow(() -> service.assertNotBlocked("1.2.3.4"));
    }

    @Test
    void blocksOnceThresholdReached() {
        LoginAttemptService service = service();
        service.recordFailure("1.2.3.4");
        service.recordFailure("1.2.3.4");
        service.recordFailure("1.2.3.4");

        assertThrows(TooManyRequestsException.class, () -> service.assertNotBlocked("1.2.3.4"));
    }

    @Test
    void successResetsTheCounter() {
        LoginAttemptService service = service();
        service.recordFailure("1.2.3.4");
        service.recordFailure("1.2.3.4");
        service.recordSuccess("1.2.3.4");
        service.recordFailure("1.2.3.4"); // counts as the first failure again

        assertDoesNotThrow(() -> service.assertNotBlocked("1.2.3.4"));
    }

    @Test
    void differentClientsAreTrackedIndependently() {
        LoginAttemptService service = service();
        service.recordFailure("1.1.1.1");
        service.recordFailure("1.1.1.1");
        service.recordFailure("1.1.1.1"); // blocks 1.1.1.1 only

        assertThrows(TooManyRequestsException.class, () -> service.assertNotBlocked("1.1.1.1"));
        assertDoesNotThrow(() -> service.assertNotBlocked("2.2.2.2"));
    }

    @Test
    void nullClientKeyIsIgnored() {
        LoginAttemptService service = service();
        assertDoesNotThrow(() -> service.recordFailure(null));
        assertDoesNotThrow(() -> service.assertNotBlocked(null));
        assertDoesNotThrow(() -> service.recordSuccess(null));
    }
}
