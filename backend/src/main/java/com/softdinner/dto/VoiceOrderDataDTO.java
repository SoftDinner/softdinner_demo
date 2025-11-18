package com.softdinner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceOrderDataDTO {
    private String dinnerId; // 디너 ID
    private String dinnerName; // 디너 이름
    private String styleId; // 스타일 ID
    private String styleName; // 스타일 이름
    private String deliveryDate; // 배달 날짜 (ISO 8601 형식)
    private String deliveryAddress; // 사용자가 새로 제공한 배송지
    private String cardNumber; // 새 결제 카드 번호 (원문 그대로 저장)
    private String cardExpiry; // 새 결제 카드 만료일
    private String cardCvc; // 새 결제 카드 CVC
    private Map<String, Integer> customizations; // 메뉴 아이템 ID -> 수량
}


