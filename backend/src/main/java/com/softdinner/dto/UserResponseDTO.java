package com.softdinner.dto;

import lombok.*;
import java.time.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {
    
    private String id;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private String role;
    private String loyaltyTier;
    private Integer totalOrders;
    private Double totalSpent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

