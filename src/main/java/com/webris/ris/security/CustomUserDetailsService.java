package com.webris.ris.security;

import com.webris.ris.entity.User;
import com.webris.ris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Used by Spring Security's DaoAuthenticationProvider during login.
     * Accepts email, mobile, or username (tries in that order).
     * The transaction keeps the session open so that the lazy Center relation
     * inside UserPrincipal.create() can be resolved without a LazyInitializationException.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByMobile(identifier))
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No account found for: " + identifier));
        return UserPrincipal.create(user);
    }

    /**
     * Used by JwtAuthenticationFilter on every authenticated request.
     * A single primary-key lookup replaces the previous 3-query email/mobile/username search.
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with id: " + id));
        return UserPrincipal.create(user);
    }
}
