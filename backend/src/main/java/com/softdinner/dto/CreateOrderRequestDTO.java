package com.softdinner.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequestDTO {
    
    @NotBlank(message = "Dinner ID is required")
    private String dinnerId;
    
    @NotBlank(message = "Style ID is required")
    private String styleId;
    
    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;
    
    @NotNull(message = "Delivery date is required")
    private LocalDateTime deliveryDate;
    
    // 커스터마이징 정보: { menuItemId: quantity }
    private Map<String, Integer> customizations;
    
    // 결제 정보 (간단한 버전)
    private PaymentInfoDTO paymentInfo;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentInfoDTO {
        private String cardNumber;
        private String expiryDate;
        private String cvc;
    }
}

