package com.softdinner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderHistoryDTO {
    private String id;
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
    
    // 주문 항목에서 추출한 정보 (편의 필드)
    private String dinnerName;
    private String styleName;
    
    // 고객 정보
    private String userId;
    private String customerName;
}

