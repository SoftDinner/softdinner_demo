package com.softdinner.dto;

import lombok.*;

import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DinnerDTO {
    private String id;
    private String name;
    private Double basePrice;
    private String description;
    private List<String> availableStyles;
    private String imageUrl;
    private Boolean isAvailable;
}

