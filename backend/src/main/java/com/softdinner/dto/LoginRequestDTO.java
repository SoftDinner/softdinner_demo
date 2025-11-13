package com.softdinner.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
public class LoginRequestDTO {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    private String password;
}

