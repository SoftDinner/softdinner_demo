package com.softdinner.controller.user;

import com.softdinner.dto.LoyaltyInfoDTO;
import com.softdinner.service.LoyaltyService;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final LoyaltyService loyaltyService;

    @GetMapping("/loyalty")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LoyaltyInfoDTO> getLoyaltyInfo(Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();

            LoyaltyInfoDTO loyaltyInfo = loyaltyService.getLoyaltyInfo(userId);
            return ResponseEntity.ok(loyaltyInfo);
        } catch (Exception e) {
            log.error("Error getting loyalty info: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{userId}/loyalty")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<LoyaltyInfoDTO> getCustomerLoyaltyInfo(@PathVariable String userId) {
        try {
            LoyaltyInfoDTO loyaltyInfo = loyaltyService.getLoyaltyInfo(userId);
            return ResponseEntity.ok(loyaltyInfo);
        } catch (Exception e) {
            log.error("Error getting customer loyalty info for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

