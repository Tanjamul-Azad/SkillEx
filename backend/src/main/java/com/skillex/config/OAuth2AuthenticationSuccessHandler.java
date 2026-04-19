package com.skillex.config;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;

    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException {
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User oAuth2User)) {
            response.sendRedirect(frontendBaseUrl + "/login?oauth=error");
            return;
        }

        String email = asString(oAuth2User.getAttribute("email"));
        String name = asString(oAuth2User.getAttribute("name"));
        String picture = asString(oAuth2User.getAttribute("picture"));

        AuthResponse auth;
        try {
            auth = authService.loginWithGoogle(email, name, picture);
        } catch (RuntimeException ex) {
            response.sendRedirect(frontendBaseUrl + "/login?oauth=error");
            return;
        }

        String redirectUrl = UriComponentsBuilder
            .fromHttpUrl(frontendBaseUrl)
            .path("/login")
            .queryParam("oauth", "success")
            .queryParam("token", auth.token())
            .build(true)
            .toUriString();

        response.sendRedirect(redirectUrl);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
