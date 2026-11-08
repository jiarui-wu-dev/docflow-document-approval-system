package com.jeri.docflow.controller;

import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.repository.UserRepository;
import com.jeri.docflow.security.CustomUserDetailsService;
import com.jeri.docflow.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, CustomUserDetailsService.class})
class AuthEndpointTest {
    @Autowired private MockMvc mvc;
    @Autowired private PasswordEncoder encoder;
    @MockitoBean private UserRepository users;

    private void account(UserRole role) {
        var user = new User();
        user.setId(42L);
        user.setUsername("test-user");
        user.setRole(role);
        user.setPasswordHash(encoder.encode("test-password"));
        when(users.findByUsername("test-user")).thenReturn(Optional.of(user));
    }

    private String basic(String password) {
        return "Basic " + Base64.getEncoder().encodeToString(
                ("test-user:" + password).getBytes(StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void returnsOnlyAuthenticatedIdentityForEveryRole(UserRole role) throws Exception {
        account(role);
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, basic("test-password")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", aMapWithSize(3)))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.username").value("test-user"))
                .andExpect(jsonPath("$.role").value(role.name()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void rejectsMissingCredentials() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidCredentials() throws Exception {
        account(UserRole.ADMIN);
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, basic("wrong-password")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingEndpointReturnsNotFoundInsteadOfInternalServerError() throws Exception {
        account(UserRole.ADMIN);
        mvc.perform(get("/api/auth/missing").header(HttpHeaders.AUTHORIZATION, basic("test-password")))
                .andExpect(status().isNotFound());
    }
}
