package com.softdinner.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDTO {
    
    private String accessToken;
    private String refreshToken;
    private UserResponseDTO user;
    private String role;
    private String message;
}

