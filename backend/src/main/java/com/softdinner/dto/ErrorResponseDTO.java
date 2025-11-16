package com.softdinner.dto;

import lombok.*;
import java.time.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponseDTO {
    
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
}

