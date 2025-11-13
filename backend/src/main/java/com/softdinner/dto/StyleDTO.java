package com.softdinner.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StyleDTO {
    private String id;
    private String name;
    private Double priceModifier;
    private String details;
}

