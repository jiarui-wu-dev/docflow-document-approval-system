package com.jeri.docflow.controller;

import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.exception.BusinessException;
import com.jeri.docflow.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Provides UI identity without exposing credentials or changing HTTP Basic authentication. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Identity")
@SecurityRequirement(name = "basicAuth")
public class AuthController {
    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public CurrentUser me(Authentication authentication) {
        var user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));
        return new CurrentUser(user.getId(), user.getUsername(), user.getRole());
    }

    public record CurrentUser(Long id, String username, UserRole role) {}
}
