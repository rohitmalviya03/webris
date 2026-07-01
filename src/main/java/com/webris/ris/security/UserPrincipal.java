package com.webris.ris.security;

import com.webris.ris.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Immutable Spring Security principal built from the User entity.
 * Written explicitly (no Lombok) because isEnabled() / isAccountNonLocked()
 * must return live values from the entity, not hardcoded true.
 */
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String email;
    private final String password;
    private final String role;
    private final Long centerId;
    private final boolean userEnabled;
    private final boolean userAccountNonLocked;
    private final Collection<? extends GrantedAuthority> authorities;

    private UserPrincipal(Long id, String username, String email, String password,
                          String role, Long centerId,
                          boolean userEnabled, boolean userAccountNonLocked,
                          Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.centerId = centerId;
        this.userEnabled = userEnabled;
        this.userAccountNonLocked = userAccountNonLocked;
        this.authorities = authorities;
    }

    public static UserPrincipal create(User user) {
        boolean locked = Boolean.TRUE.equals(user.getAccountLocked());

        // Auto-expire time-based locks without a DB write — the lock is cleared
        // permanently by LoginAttemptService.resetFailedAttempts() on next success.
        if (locked && user.getLockExpiresAt() != null
                && user.getLockExpiresAt().isBefore(LocalDateTime.now())) {
            locked = false;
        }

        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        return new UserPrincipal(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                user.getRole().name(),
                user.getCenter() != null ? user.getCenter().getId() : null,
                Boolean.TRUE.equals(user.getIsActive()),
                !locked,
                authorities);
    }

    // ── Explicit getters (not delegated to Lombok to avoid naming collisions) ──

    public Long getId()       { return id; }
    public String getEmail()  { return email; }
    public String getRole()   { return role; }
    public Long getCenterId() { return centerId; }

    // ── UserDetails interface ─────────────────────────────────────────────────

    @Override public String getUsername()   { return username; }
    @Override public String getPassword()   { return password; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

    /** Uses the entity's isActive flag — deactivated users are rejected at login. */
    @Override public boolean isEnabled()            { return userEnabled; }

    /** Uses the entity's accountLocked flag — respects time-based lock expiry. */
    @Override public boolean isAccountNonLocked()   { return userAccountNonLocked; }

    @Override public boolean isAccountNonExpired()  { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
}
