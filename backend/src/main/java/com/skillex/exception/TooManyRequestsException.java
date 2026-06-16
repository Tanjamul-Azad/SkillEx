package com.skillex.exception;

/**
 * Raised when a client exceeds an allowed request rate (e.g. repeated failed logins).
 * Mapped to HTTP 429 by {@code GlobalExceptionHandler}.
 */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
