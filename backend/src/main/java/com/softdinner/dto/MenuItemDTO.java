package com.softdinner.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuItemDTO {
    private String id;
    private String dinnerId;
    private String name;
    private Integer defaultQuantity;
    private String unit;
    private Double basePrice;
    private Double additionalPrice;
    private Boolean isRequired;
    private Boolean canRemove;
    private Boolean canIncrease;
    private Boolean canDecrease;
    private Integer maxQuantity;
    private Integer minQuantity;
    private String ingredientId;
    private Double ingredientQuantityPerUnit;
}

