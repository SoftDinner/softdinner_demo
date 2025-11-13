package com.softdinner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddStockRequestDTO {
    @NotBlank(message = "재료 ID는 필수입니다")
    private String ingredientId;
    
    @NotNull(message = "입고 수량은 필수입니다")
    @Positive(message = "입고 수량은 0보다 커야 합니다")
    private BigDecimal quantity;
    
    private String notes;
}

