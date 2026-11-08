package com.jeri.docflow.bootstrap;

import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.UserRole;
import com.jeri.docflow.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/** Explicit local bootstrap only. Never overwrites an existing account or logs credentials. */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "docflow.dev-users.enabled", havingValue = "true")
public class DevUserInitializer implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final List<SeedUser> candidates;

    public DevUserInitializer(UserRepository users, PasswordEncoder encoder,
            @Value("${docflow.dev-users.alice-password:}") String alicePassword,
            @Value("${docflow.dev-users.bob-password:}") String bobPassword,
            @Value("${docflow.dev-users.admin-password:}") String adminPassword) {
        this.users = users;
        this.encoder = encoder;
        this.candidates = List.of(new SeedUser("alice", UserRole.SUBMITTER, alicePassword),
                new SeedUser("bob", UserRole.REVIEWER, bobPassword),
                new SeedUser("admin", UserRole.ADMIN, adminPassword));
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var missing = candidates.stream().filter(seed -> users.findByUsername(seed.username).isEmpty()).toList();
        for (var seed : missing) {
            if (seed.password.length() < 12 || seed.password.toLowerCase(Locale.ROOT).startsWith("replace-")
                    || seed.password.startsWith("<")) {
                throw new IllegalStateException("Provide a non-placeholder password of at least 12 characters for development user " + seed.username);
            }
        }
        for (var seed : missing) {
            var user = new User();
            user.setUsername(seed.username);
            user.setEmail(seed.username + "@example.invalid");
            user.setRole(seed.role);
            user.setPasswordHash(encoder.encode(seed.password));
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            users.save(user);
        }
    }

    private record SeedUser(String username, UserRole role, String password) {}
}
