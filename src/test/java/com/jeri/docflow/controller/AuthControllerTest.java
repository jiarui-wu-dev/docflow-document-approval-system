package com.jeri.docflow.controller;

import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AuthControllerTest {
    @Test
    void returnsDatabaseIdentityForAuthenticatedPrincipal() {
        var users = mock(UserRepository.class);
        var user = new User();
        user.setId(42L);
        user.setUsername("reviewer");
        user.setRole(UserRole.REVIEWER);
        when(users.findByUsername("reviewer")).thenReturn(Optional.of(user));
        var response = new AuthController(users).me(new UsernamePasswordAuthenticationToken("reviewer", null));
        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.username()).isEqualTo("reviewer");
        assertThat(response.role()).isEqualTo(UserRole.REVIEWER);
    }
}
