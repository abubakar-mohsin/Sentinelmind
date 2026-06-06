package com.sentinelmind.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * SecurityConfig — NFR-04 (SRS): "Dashboard access shall use JWT auth."
 *
 * Two profiles, two behaviours:
 *
 *   mock profile (default / demo mode):
 *     All requests are permitted — no login required.
 *     The demo runs with a single `docker compose up`, no credentials needed.
 *
 *   real profile (production mode):
 *     Every API request must carry an Authorization header.
 *     Currently configured as HTTP Basic (username: admin, password: sentinelmind).
 *     The production upgrade path is to swap httpBasic() for a JWT Bearer filter:
 *       1. Add jjwt dependency.
 *       2. Implement JwtAuthFilter extends OncePerRequestFilter.
 *       3. Add http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class).
 *       4. Issue tokens from a POST /api/auth/login endpoint.
 *     WebSocket (/ws/**) and health (/actuator/health) remain open in both modes.
 *
 * Why two beans instead of one?
 *   Spring Security does not allow conditional logic inside a single SecurityFilterChain
 *   based on a runtime flag. @Profile on separate @Bean methods is the idiomatic approach.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // ─────────────────────────────────────────────────────────────────────────
    // MOCK / DEMO PROFILE — no authentication required
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Demo security: permit everything.
     * CSRF is disabled so the SimulateButton (POST /api/events) works from the browser.
     * The WebSocket upgrade handshake and all REST calls pass through freely.
     */
    @Bean
    @Profile("mock")
    public SecurityFilterChain demoSecurityChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll());
        return http.build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REAL / PRODUCTION PROFILE — authentication enforced
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Production security: require credentials on every request except:
     *   - /actuator/health  — Docker health check must be unauthenticated
     *   - /ws/**            — WebSocket upgrade handshake
     *
     * Currently HTTP Basic. Upgrade to JWT by replacing httpBasic() with a
     * custom JwtAuthFilter (see class Javadoc above).
     */
    @Bean
    @Profile("real")
    public SecurityFilterChain productionSecurityChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/ws/**").permitAll()      // WebSocket upgrade
                .anyRequest().authenticated())
            .httpBasic(basic -> {});                        // swap for JWT filter in production
        return http.build();
    }

    /**
     * In-memory user store for the "real" profile demo credentials.
     * Replace with a proper UserDetailsService backed by a database or LDAP in production.
     * Username: admin | Password: sentinelmind | Role: ANALYST
     */
    @Bean
    @Profile("real")
    public UserDetailsService inMemoryUsers() {
        UserDetails analyst = User.builder()
                .username("admin")
                .password("{noop}sentinelmind")   // {noop} = no password encoding (demo only)
                .roles("ANALYST")
                .build();
        return new InMemoryUserDetailsManager(analyst);
    }
}
