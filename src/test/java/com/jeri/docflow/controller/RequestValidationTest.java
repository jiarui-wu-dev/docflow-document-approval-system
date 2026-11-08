package com.jeri.docflow.controller;

import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.repository.UserRepository;
import com.jeri.docflow.security.CustomUserDetailsService;
import com.jeri.docflow.security.SecurityConfig;
import com.jeri.docflow.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocumentController.class)
@Import({SecurityConfig.class, CustomUserDetailsService.class})
class RequestValidationTest {
    @Autowired private MockMvc mvc;
    @Autowired private PasswordEncoder encoder;
    @MockitoBean private UserRepository users;
    @MockitoBean private DocumentService documents;
    private String authorization;

    @BeforeEach
    void account() {
        var user = new User();
        user.setUsername("validation-test");
        user.setPasswordHash(encoder.encode("unit-test-only"));
        user.setRole(UserRole.SUBMITTER);
        when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
        authorization = "Basic " + Base64.getEncoder().encodeToString(
                "validation-test:unit-test-only".getBytes(StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"title\":\"\"}", "{\"title\":\"Example\",\"reviewerId\":-1}", "{broken"})
    void invalidCreationReturnsSafe400BeforeService(String body) throws Exception {
        mvc.perform(post("/api/documents").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request: check required fields, values, and length limits"));
        verifyNoInteractions(documents);
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNKNOWN", ""})
    void invalidStatusFilterReturns400(String status) throws Exception {
        // A blank filter is treated as absent by Spring; use invalid path IDs for that case.
        var request = status.isEmpty() ? get("/api/documents/not-an-id")
                : get("/api/documents").param("status", status);
        mvc.perform(request.header("Authorization", authorization)).andExpect(status().isBadRequest());
        verifyNoInteractions(documents);
    }

    @Test
    void oversizedTitleIsRejectedBeforePersistence() throws Exception {
        mvc.perform(post("/api/documents").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"" + "x".repeat(201) + "\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(documents);
    }

    @Test
    void unsupportedMethodIs405InsteadOf500() throws Exception {
        mvc.perform(delete("/api/documents").header("Authorization", authorization))
                .andExpect(status().isMethodNotAllowed());
        verifyNoInteractions(documents);
    }

    @Test
    void unsupportedContentTypeIs415InsteadOf500() throws Exception {
        mvc.perform(post("/api/documents").header("Authorization", authorization)
                        .contentType(MediaType.TEXT_PLAIN).content("invalid request"))
                .andExpect(status().isUnsupportedMediaType());
        verifyNoInteractions(documents);
    }
}
