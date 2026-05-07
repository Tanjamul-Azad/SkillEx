package com.skillex.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {
    // In-memory cache for OTPs: email -> OTP
    // In production, use Redis with expiration
    private final Map<String, String> otpCache = new ConcurrentHashMap<>();
    
    public void generateAndSendOtp(String email) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpCache.put(email.toLowerCase(), otp);
        
        // Simulate sending an email (since we don't have a real email provider configured)
        log.info("==========================================================");
        log.info("SIMULATED EMAIL SENT TO: {}", email);
        log.info("YOUR OTP CODE IS: {}", otp);
        log.info("==========================================================");
    }
    
    public boolean verifyOtp(String email, String otp) {
        String cachedOtp = otpCache.get(email.toLowerCase());
        if (cachedOtp != null && cachedOtp.equals(otp)) {
            otpCache.remove(email.toLowerCase());
            return true;
        }
        return false;
    }
}
