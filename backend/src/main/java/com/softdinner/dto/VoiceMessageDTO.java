package com.softdinner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoiceMessageDTO {
    private String role; // "system", "user", "assistant"
    private String content;
}


