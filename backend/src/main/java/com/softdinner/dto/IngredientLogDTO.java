package com.softdinner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngredientLogDTO {
    private String id;
    private String ingredientId;
    private String ingredientName;
    private String ingredientUnit;
    private String action; // 'in' or 'out'
    private BigDecimal quantity;
    private BigDecimal previousQuantity;
    private BigDecimal newQuantity;
    private String staffId;
    private String staffName;
    private String orderId;
    private String notes;
    private LocalDateTime createdAt;
}

