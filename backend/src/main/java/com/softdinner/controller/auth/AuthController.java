package com.softdinner.controller.auth;

import com.softdinner.dto.*;
import com.softdinner.service.AuthService;
import jakarta.validation.*;
import lombok.*;
import lombok.extern.slf4j.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.*;
import org.springframework.security.core.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponseDTO> signup(@Valid @RequestBody SignupRequestDTO request) {
        try {
            // Validate role
            if (!request.getRole().equals("customer") && !request.getRole().equals("staff")) {
                return ResponseEntity.badRequest()
                        .body(AuthResponseDTO.builder()
                                .message("Invalid role. Must be 'customer' or 'staff'")
                                .build());
            }

            AuthResponseDTO response = authService.signup(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Signup error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponseDTO.builder()
                            .message("Signup failed: " + e.getMessage())
                            .build());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        try {
            AuthResponseDTO response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Login error: {}", e.getMessage(), e);
            // Use the exception message directly (already user-friendly from AuthService)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponseDTO.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponseDTO> getCurrentUser(Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();
            
            UserResponseDTO user = authService.getCurrentUser(userId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get current user error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponseDTO> logout() {
        // Logout is handled client-side by removing the token
        // This endpoint is just for consistency
        return ResponseEntity.ok(AuthResponseDTO.builder()
                .message("Logout successful")
                .build());
    }
}

