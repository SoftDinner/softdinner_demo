package com.softdinner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceChatResponseDTO {
    private String sessionId;
    private String assistantMessage; // AI 응답 메시지
    
    @JsonProperty("isOrderComplete") // JSON 필드명을 명시적으로 지정
    private boolean isOrderComplete; // 주문 완료 여부
    
    private VoiceOrderDataDTO orderData; // 주문 데이터 (완료 시에만)
}

