package com.softdinner.service;

import com.softdinner.dto.LoyaltyInfoDTO;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.*;
import java.util.Arrays;

@Slf4j
@Service
public class LoyaltyService {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public LoyaltyService(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    // 단골 등급별 할인율
    private static final Map<String, BigDecimal> DISCOUNT_RATES = Map.of(
            "bronze", BigDecimal.ZERO,
            "silver", new BigDecimal("0.05"),  // 5%
            "gold", new BigDecimal("0.10"),    // 10%
            "platinum", new BigDecimal("0.20")  // 20%
    );

    // 단골 등급별 최소 조건 (주문 횟수만)
    private static final Map<String, TierCriteria> TIER_CRITERIA = Map.of(
            "bronze", new TierCriteria(0, BigDecimal.ZERO),
            "silver", new TierCriteria(5, BigDecimal.ZERO),      // 5주문
            "gold", new TierCriteria(15, BigDecimal.ZERO),      // 15주문
            "platinum", new TierCriteria(30, BigDecimal.ZERO)     // 30주문
    );

    @Data
    @AllArgsConstructor
    private static class TierCriteria {
        private int minOrders;
        private BigDecimal minSpent;
    }

    /**
     * 등급별 할인율 조회
     */
    public BigDecimal getDiscountRateByTier(String tier) {
        return DISCOUNT_RATES.getOrDefault(tier.toLowerCase(), BigDecimal.ZERO);
    }

    /**
     * 주문 횟수와 지출액으로 적합한 등급 결정
     * 주문 횟수 또는 지출액 중 하나라도 기준을 만족하면 해당 등급
     * 높은 등급부터 확인하여 가장 높은 등급을 반환
     */
    public String determineLoyaltyTier(int totalOrders, BigDecimal totalSpent) {
        String highestTier = "bronze";
        
        // 등급을 높은 것부터 낮은 순서로 확인 (platinum -> gold -> silver -> bronze)
        // 가장 높은 등급부터 확인하여 조건을 만족하는 첫 번째 등급을 반환
        List<String> tierOrder = Arrays.asList("platinum", "gold", "silver", "bronze");
        
        for (String tier : tierOrder) {
            TierCriteria criteria = TIER_CRITERIA.get(tier);
            if (criteria == null) continue;
            
            // 주문 횟수 기준으로 등급 결정
            if (totalOrders >= criteria.getMinOrders()) {
                highestTier = tier;
                break; // 가장 높은 등급을 찾았으므로 종료
            }
        }
        
        return highestTier;
    }

    /**
     * 사용자의 단골 등급 업데이트
     * @return 업그레이드 여부, 이전 등급, 새 등급 정보
     */
    @SuppressWarnings("unchecked")
    public LoyaltyUpdateResult updateLoyaltyTier(String userId, int newTotalOrders, BigDecimal newTotalSpent) {
        try {
            // 1. 현재 사용자 정보 조회
            Map<String, Object>[] userArray = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (userArray == null || userArray.length == 0) {
                log.error("User not found: {}", userId);
                return LoyaltyUpdateResult.builder()
                        .upgraded(false)
                        .oldTier("bronze")
                        .newTier("bronze")
                        .message("사용자를 찾을 수 없습니다.")
                        .build();
            }

            Map<String, Object> user = userArray[0];
            String currentTier = (String) user.get("loyalty_tier");
            if (currentTier == null) {
                currentTier = "bronze";
            }

            // 2. 새 등급 결정
            String newTier = determineLoyaltyTier(newTotalOrders, newTotalSpent);

            // 3. 등급 비교
            if (newTier.equals(currentTier)) {
                return LoyaltyUpdateResult.builder()
                        .upgraded(false)
                        .oldTier(currentTier)
                        .newTier(newTier)
                        .message("등급이 변경되지 않았습니다.")
                        .build();
            }

            // 4. 등급 업그레이드
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("loyalty_tier", newTier);

            supabaseWebClient.patch()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(updateData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            // 5. loyalty_history에 기록
            try {
                Map<String, Object> historyData = new HashMap<>();
                historyData.put("user_id", userId);
                historyData.put("action_type", "tier_upgrade");
                historyData.put("previous_tier", currentTier);
                historyData.put("new_tier", newTier);
                historyData.put("notes", String.format("%s 등급에서 %s 등급으로 업그레이드", 
                        getTierName(currentTier), getTierName(newTier)));

                supabaseWebClient.post()
                        .uri(supabaseUrl + "/rest/v1/loyalty_history")
                        .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                        .header("apikey", supabaseServiceRoleKey)
                        .header("Content-Type", "application/json")
                        .header("Prefer", "return=representation")
                        .bodyValue(historyData)
                        .retrieve()
                        .bodyToMono(Map[].class)
                        .block();

                log.info("Loyalty history recorded for user {}: {} -> {}", userId, currentTier, newTier);
            } catch (Exception e) {
                log.warn("Failed to record loyalty history for user {}: {}", userId, e.getMessage());
                // history 기록 실패해도 등급 업그레이드는 계속 진행
            }

            String message = String.format("축하합니다! %s 등급에서 %s 등급으로 업그레이드되었습니다!", 
                    getTierName(currentTier), getTierName(newTier));

            log.info("Loyalty tier upgraded for user {}: {} -> {}", userId, currentTier, newTier);

            return LoyaltyUpdateResult.builder()
                    .upgraded(true)
                    .oldTier(currentTier)
                    .newTier(newTier)
                    .message(message)
                    .build();

        } catch (Exception e) {
            log.error("Error updating loyalty tier: {}", e.getMessage(), e);
            return LoyaltyUpdateResult.builder()
                    .upgraded(false)
                    .oldTier("bronze")
                    .newTier("bronze")
                    .message("등급 업데이트 중 오류가 발생했습니다.")
                    .build();
        }
    }

    /**
     * 사용자의 단골 정보 조회
     */
    @SuppressWarnings("unchecked")
    public LoyaltyInfoDTO getLoyaltyInfo(String userId) {
        try {
            // 1. 사용자 정보 조회
            Map<String, Object>[] userArray = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (userArray == null || userArray.length == 0) {
                throw new RuntimeException("User not found");
            }

            Map<String, Object> user = userArray[0];
            Integer totalOrders = ((Number) user.getOrDefault("total_orders", 0)).intValue();
            BigDecimal totalSpent = new BigDecimal(user.getOrDefault("total_spent", 0).toString());
            
            // 실제 등급을 주문 횟수와 지출액으로 다시 계산 (DB에 저장된 값이 잘못될 수 있음)
            String tier = determineLoyaltyTier(totalOrders, totalSpent);
            BigDecimal discountRate = getDiscountRateByTier(tier);

            // 2. 다음 등급 정보 계산
            LoyaltyInfoDTO.NextTierInfoDTO nextTier = calculateNextTier(tier, totalOrders, totalSpent);

            // 3. 최근 할인 기록 조회 (최근 5개 주문)
            List<LoyaltyInfoDTO.DiscountHistoryDTO> recentDiscounts = getRecentDiscounts(userId);

            return LoyaltyInfoDTO.builder()
                    .tier(tier)
                    .totalOrders(totalOrders)
                    .totalSpent(totalSpent)
                    .discountRate(discountRate)
                    .nextTier(nextTier)
                    .recentDiscounts(recentDiscounts)
                    .build();

        } catch (Exception e) {
            log.error("Error getting loyalty info: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get loyalty info: " + e.getMessage());
        }
    }

    /**
     * 다음 등급까지 필요한 정보 계산
     */
    private LoyaltyInfoDTO.NextTierInfoDTO calculateNextTier(String currentTier, int totalOrders, BigDecimal totalSpent) {
        String nextTier = getNextTier(currentTier);
        if (nextTier == null) {
            // 이미 최고 등급
            return LoyaltyInfoDTO.NextTierInfoDTO.builder()
                    .tier("platinum")
                    .ordersNeeded(0)
                    .amountNeeded(BigDecimal.ZERO)
                    .progressPercentage(100.0)
                    .build();
        }

        TierCriteria nextCriteria = TIER_CRITERIA.get(nextTier);
        int ordersNeeded = Math.max(0, nextCriteria.getMinOrders() - totalOrders);

        // 진행률 계산 (주문 횟수 기준)
        double progressPercentage = nextCriteria.getMinOrders() > 0
                ? Math.min(100.0, (double) totalOrders / nextCriteria.getMinOrders() * 100.0)
                : 100.0;

        return LoyaltyInfoDTO.NextTierInfoDTO.builder()
                .tier(nextTier)
                .minOrders(nextCriteria.getMinOrders())
                .ordersNeeded(ordersNeeded)
                .amountNeeded(BigDecimal.ZERO)
                .progressPercentage(progressPercentage)
                .build();
    }

    private String getNextTier(String currentTier) {
        return switch (currentTier.toLowerCase()) {
            case "bronze" -> "silver";
            case "silver" -> "gold";
            case "gold" -> "platinum";
            default -> null; // 이미 최고 등급
        };
    }

    /**
     * 최근 할인 기록 조회
     */
    @SuppressWarnings("unchecked")
    private List<LoyaltyInfoDTO.DiscountHistoryDTO> getRecentDiscounts(String userId) {
        try {
            // 최근 5개 주문 조회 (할인이 적용된 주문만)
            List<Map<String, Object>> orders = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/orders?user_id=eq." + userId 
                            + "&discount_applied=gt.0&order=order_date.desc&limit=5")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            if (orders == null) {
                return new java.util.ArrayList<>();
            }

            return orders.stream().map(order -> {
                java.time.Instant orderDateInstant = (java.time.Instant) order.get("order_date");
                String orderDateStr = orderDateInstant != null 
                        ? orderDateInstant.toString() 
                        : "";

                return LoyaltyInfoDTO.DiscountHistoryDTO.builder()
                        .orderId((String) order.get("id"))
                        .discountAmount(new BigDecimal(order.get("discount_applied").toString()))
                        .orderTotal(new BigDecimal(order.get("final_price").toString()))
                        .orderDate(orderDateStr)
                        .build();
            }).collect(java.util.stream.Collectors.toList());

        } catch (Exception e) {
            log.warn("Error getting recent discounts: {}", e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    private String getTierName(String tier) {
        return switch (tier.toLowerCase()) {
            case "bronze" -> "브론즈";
            case "silver" -> "실버";
            case "gold" -> "골드";
            case "platinum" -> "플래티넘";
            default -> tier;
        };
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoyaltyUpdateResult {
        private Boolean upgraded;
        private String oldTier;
        private String newTier;
        private String message;
    }
}

