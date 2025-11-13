package com.softdinner.repository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@Repository
public class IngredientRepository {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public IngredientRepository(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    /**
     * 모든 재료 목록 조회
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllIngredients() {
        try {
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/ingredients?order=name.asc")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null ? List.of(result) : List.of();
        } catch (Exception e) {
            log.error("Error fetching ingredients: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch ingredients: " + e.getMessage(), e);
        }
    }

    /**
     * 특정 재료 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getIngredientById(String ingredientId) {
        try {
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/ingredients?id=eq." + ingredientId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (result != null && result.length > 0) {
                return result[0];
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching ingredient by id: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch ingredient: " + e.getMessage(), e);
        }
    }

    /**
     * 재료 수량 업데이트
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> updateIngredientQuantity(String ingredientId, BigDecimal newQuantity) {
        try {
            Map<String, Object> updateData = Map.of("quantity", newQuantity.toString());

            Map<String, Object>[] result = supabaseWebClient.patch()
                    .uri(supabaseUrl + "/rest/v1/ingredients?id=eq." + ingredientId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(updateData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (result != null && result.length > 0) {
                return result[0];
            }
            return null;
        } catch (Exception e) {
            log.error("Error updating ingredient quantity: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update ingredient: " + e.getMessage(), e);
        }
    }

    /**
     * 입출고 기록 저장
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> createIngredientLog(Map<String, Object> logData) {
        try {
            Map<String, Object>[] result = supabaseWebClient.post()
                    .uri(supabaseUrl + "/rest/v1/ingredient_logs")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(logData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (result != null && result.length > 0) {
                return result[0];
            }
            return null;
        } catch (Exception e) {
            log.error("Error creating ingredient log: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create ingredient log: " + e.getMessage(), e);
        }
    }

    /**
     * 입출고 기록 조회
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getIngredientLogs(String ingredientId, Integer limit) {
        try {
            String uri = supabaseUrl + "/rest/v1/ingredient_logs";
            if (ingredientId != null && !ingredientId.isEmpty()) {
                uri += "?ingredient_id=eq." + ingredientId;
            }
            uri += (ingredientId != null ? "&" : "?") + "order=created_at.desc";
            if (limit != null && limit > 0) {
                uri += "&limit=" + limit;
            }

            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null ? List.of(result) : List.of();
        } catch (Exception e) {
            log.error("Error fetching ingredient logs: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch ingredient logs: " + e.getMessage(), e);
        }
    }

    /**
     * 사용자 이름 조회 (staff_id로)
     */
    @SuppressWarnings("unchecked")
    public String getUserNameById(String userId) {
        try {
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId + "&select=full_name")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (result != null && result.length > 0) {
                return (String) result[0].get("full_name");
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching user name: {}", e.getMessage(), e);
            return null;
        }
    }
}

