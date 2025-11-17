package com.softdinner.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.*;
import lombok.extern.slf4j.*;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.authority.*;
import org.springframework.security.core.context.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.*;
import org.springframework.web.filter.*;
import org.springframework.web.reactive.function.client.*;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.*;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseAnonKey;
    private final String supabaseServiceRoleKey;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        
        try {
            // Verify token with Supabase
            Map<String, Object> userData = verifyTokenWithSupabase(token);
            
            if (userData != null) {
                String userId = (String) userData.get("id");
                
                // Get user role from database
                List<GrantedAuthority> authorities = new ArrayList<>();
                try {
                    Map<String, Object> userInfo = getUserFromDatabase(userId);
                    if (userInfo != null) {
                        String role = (String) userInfo.get("role");
                        if (role != null) {
                            // Spring Security expects roles to start with ROLE_
                            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                            log.debug("User {} has role: {}", userId, role);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch user role for {}: {}", userId, e.getMessage());
                }
                
                // Create authentication
                UserDetails userDetails = User.builder()
                        .username(userId)
                        .password("")
                        .authorities(authorities)
                        .build();
                
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                );
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.error("Error verifying token: {}", e.getMessage());
            // Continue without authentication - let the endpoint handle it
        }
        
        filterChain.doFilter(request, response);
    }

    private Map<String, Object> verifyTokenWithSupabase(String token) {
        try {
            // Call Supabase Auth API to verify token
            // Use anon key for token verification (same as login)
            @SuppressWarnings("unchecked")
            Map<String, Object> response = supabaseWebClient.get()
                    .uri(supabaseUrl + "/auth/v1/user")
                    .header("Authorization", "Bearer " + token)
                    .header("apikey", supabaseAnonKey) // Use anon key for token verification
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            
            return response;
        } catch (WebClientResponseException e) {
            // 403 Forbidden은 인증되지 않은 요청이거나 만료된 토큰일 수 있음 (정상적인 경우)
            if (e.getStatusCode().value() == 403 || e.getStatusCode().value() == 401) {
                log.debug("Token verification failed (unauthorized/forbidden): {}", e.getMessage());
            } else {
                log.warn("Error verifying token with Supabase (status {}): {}", 
                        e.getStatusCode().value(), e.getMessage());
            }
            return null;
        } catch (Exception e) {
            log.warn("Error verifying token with Supabase: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> getUserFromDatabase(String userId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();
            
            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.warn("Error fetching user from database: {}", e.getMessage());
            return null;
        }
    }
}

