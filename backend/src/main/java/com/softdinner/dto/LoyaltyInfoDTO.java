package com.softdinner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyInfoDTO {
    private String tier;
    private Integer totalOrders;
    private BigDecimal totalSpent;
    private BigDecimal discountRate;
    private NextTierInfoDTO nextTier;
    private List<DiscountHistoryDTO> recentDiscounts;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NextTierInfoDTO {
        private String tier;
        private Integer minOrders;
        private Integer ordersNeeded;
        private BigDecimal amountNeeded;
        private Double progressPercentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscountHistoryDTO {
        private String orderId;
        private BigDecimal discountAmount;
        private BigDecimal orderTotal;
        private String orderDate;
    }
}

