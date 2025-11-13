package com.softdinner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngredientDTO {
    private String id;
    private String name;
    private BigDecimal quantity;
    private String unit;
    private String category;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

