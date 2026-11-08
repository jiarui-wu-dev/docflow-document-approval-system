package com.jeri.docflow.bootstrap;

import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DevUserInitializerTest {
    @Test
    void createsMissingDevelopmentAccountsWithHashedCallerSuppliedPasswords() {
        var users = mock(UserRepository.class);
        var encoder = new BCryptPasswordEncoder();
        var secret = "unit-test-only-secret";
        new DevUserInitializer(users, encoder, secret, secret, secret).run(null);
        var captured = ArgumentCaptor.forClass(User.class);
        verify(users, times(3)).save(captured.capture());
        assertThat(captured.getAllValues()).extracting(User::getRole)
                .containsExactly(UserRole.SUBMITTER, UserRole.REVIEWER, UserRole.ADMIN);
        for (var user : captured.getAllValues()) {
            assertThat(user.getPasswordHash()).isNotEqualTo(secret);
            assertThat(encoder.matches(secret, user.getPasswordHash())).isTrue();
        }
    }

    @Test
    void neverChangesAnExistingAccountEvenWhenBootstrapPasswordsAreMissing() {
        var users = mock(UserRepository.class);
        when(users.findByUsername(anyString())).thenReturn(Optional.of(new User()));
        new DevUserInitializer(users, new BCryptPasswordEncoder(), "", "", "").run(null);
        verify(users, never()).save(any());
    }

    @Test
    void rejectsMissingOrPlaceholderPasswordsBeforeCreatingAnyAccount() {
        var users = mock(UserRepository.class);
        assertThatThrownBy(() -> new DevUserInitializer(users, new BCryptPasswordEncoder(),
                "replace-with-a-secret", "", "").run(null)).isInstanceOf(IllegalStateException.class);
        verify(users, never()).save(any());
    }
}
