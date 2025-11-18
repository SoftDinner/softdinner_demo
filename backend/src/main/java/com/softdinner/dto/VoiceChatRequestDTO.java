package com.softdinner.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoiceChatRequestDTO {
    private String sessionId; // 세션 ID (대화 컨텍스트 유지용)
    private String userMessage; // 사용자 메시지 (텍스트)
    private List<VoiceMessageDTO> conversationHistory; // 대화 히스토리 (옵션)
}


