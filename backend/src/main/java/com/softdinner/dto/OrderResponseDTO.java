package com.softdinner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponseDTO {
    private String id;
    private String userId;
    private LocalDateTime orderDate;
    private LocalDateTime deliveryDate;
    private String deliveryAddress;
    private Map<String, Object> orderItems;
    private BigDecimal totalPrice;
    private BigDecimal discountApplied;
    private BigDecimal finalPrice;
    private String paymentStatus;
    private String deliveryStatus;
    private String cookingStatus;
    private DiscountInfoDTO discount;
    private LoyaltyUpdateResultDTO loyaltyUpdate;
    private String message;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscountInfoDTO {
        private String tier;
        private BigDecimal discountRate;
        private BigDecimal discountAmount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoyaltyUpdateResultDTO {
        private Boolean upgraded;
        private String oldTier;
        private String newTier;
        private String message;
    }
}

