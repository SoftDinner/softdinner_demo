package com.softdinner.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
public class SignupRequestDTO {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    private String phone;
    
    private String address;
    
    @NotBlank(message = "Role is required")
    private String role; // "customer" or "staff"
}

