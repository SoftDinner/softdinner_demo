package com.softdinner.repository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

@Slf4j
@Repository
public class OrderRepository {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public OrderRepository(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    /**
     * 주문 생성
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> createOrder(Map<String, Object> orderData) {
        try {
            Map<String, Object>[] result = supabaseWebClient.post()
                    .uri(supabaseUrl + "/rest/v1/orders")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(orderData)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), response -> {
                        return response.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("Error creating order: {} - {}", response.statusCode(), body);
                                    return reactor.core.publisher.Mono.error(WebClientResponseException.create(
                                            response.statusCode().value(),
                                            response.statusCode().toString(),
                                            response.headers().asHttpHeaders(),
                                            body != null ? body.getBytes() : new byte[0],
                                            java.nio.charset.StandardCharsets.UTF_8
                                    ));
                                });
                    })
                    .bodyToMono(Map[].class)
                    .block();

            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.error("Error creating order: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create order: " + e.getMessage(), e);
        }
    }

    /**
     * 사용자 정보 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserById(String userId) {
        Map<String, Object>[] result = supabaseWebClient.get()
                .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                .header("apikey", supabaseServiceRoleKey)
                .retrieve()
                .bodyToMono(Map[].class)
                .block();

        return result != null && result.length > 0 ? result[0] : null;
    }

    /**
     * 사용자 정보 업데이트 (total_orders, total_spent, loyalty_tier)
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> updateUser(String userId, Map<String, Object> updateData) {
        Map<String, Object>[] result = supabaseWebClient.patch()
                .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                .header("apikey", supabaseServiceRoleKey)
                .header("Content-Type", "application/json")
                .header("Prefer", "return=representation")
                .bodyValue(updateData)
                .retrieve()
                .bodyToMono(Map[].class)
                .block();

        return result != null && result.length > 0 ? result[0] : null;
    }

    /**
     * 디너 정보 조회
     * dinnerId가 UUID 형식이면 id로, 아니면 name으로 조회
     * 프론트엔드에서 전달하는 이름을 데이터베이스의 실제 이름으로 매핑
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDinnerById(String dinnerId) {
        // UUID 형식인지 확인 (간단한 체크: 하이픈 포함 여부)
        boolean isUuid = dinnerId != null && dinnerId.length() == 36 && dinnerId.contains("-");
        
        String queryParam;
        if (isUuid) {
            queryParam = "id=eq." + dinnerId;
        } else {
            // 프론트엔드 이름을 데이터베이스 이름으로 매핑
            String dbName = mapDinnerNameToDb(dinnerId);
            queryParam = "name=eq." + dbName;
        }
        
        List<Map<String, Object>> result = supabaseWebClient.get()
                .uri(supabaseUrl + "/rest/v1/dinners?" + queryParam)
                .header("apikey", supabaseServiceRoleKey)
                .retrieve()
                .bodyToMono(List.class)
                .block();

        return result != null && !result.isEmpty() ? result.get(0) : null;
    }
    
    /**
     * 프론트엔드에서 사용하는 디너 이름을 데이터베이스의 실제 이름으로 매핑
     */
    private String mapDinnerNameToDb(String frontendName) {
        if (frontendName == null) {
            return null;
        }
        
        // 프론트엔드 이름 -> 데이터베이스 이름 매핑
        return switch (frontendName.toLowerCase()) {
            case "valentine" -> "Valentine Dinner";
            case "french" -> "French Dinner";
            case "english" -> "English Dinner";
            case "champagne" -> "Champagne Feast";
            default -> frontendName; // 매핑되지 않으면 그대로 사용
        };
    }

    /**
     * 스타일 정보 조회
     * styleId가 UUID 형식이면 id로, 아니면 name으로 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStyleById(String styleId) {
        // UUID 형식인지 확인 (간단한 체크: 하이픈 포함 여부)
        boolean isUuid = styleId != null && styleId.length() == 36 && styleId.contains("-");
        
        String queryParam = isUuid ? "id=eq." + styleId : "name=eq." + styleId;
        
        List<Map<String, Object>> result = supabaseWebClient.get()
                .uri(supabaseUrl + "/rest/v1/styles?" + queryParam)
                .header("apikey", supabaseServiceRoleKey)
                .retrieve()
                .bodyToMono(List.class)
                .block();

        return result != null && !result.isEmpty() ? result.get(0) : null;
    }

    /**
     * 사용자의 주문 목록 조회 (최근순)
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserOrders(String userId) {
        try {
            String uri = supabaseUrl + "/rest/v1/orders?user_id=eq." + userId + "&order=order_date.desc";
            log.debug("Fetching orders from: {}", uri);
            
            List<Map<String, Object>> result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            log.debug("Retrieved {} orders from Supabase for user {}", result != null ? result.size() : 0, userId);
            if (result != null && !result.isEmpty()) {
                log.debug("First order sample: {}", result.get(0));
            }

            return result != null ? result : new java.util.ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching user orders: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch user orders: " + e.getMessage(), e);
        }
    }

    /**
     * 모든 주문 목록 조회 (직원용, 최근순)
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllOrders() {
        try {
            String uri = supabaseUrl + "/rest/v1/orders?order=order_date.desc";
            log.debug("Fetching all orders from: {}", uri);
            
            List<Map<String, Object>> result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            log.debug("Retrieved {} orders from Supabase", result != null ? result.size() : 0);
            return result != null ? result : new java.util.ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching all orders: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch all orders: " + e.getMessage(), e);
        }
    }

    /**
     * 주문 ID로 주문 정보 조회
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getOrderById(String orderId) {
        try {
            String uri = supabaseUrl + "/rest/v1/orders?id=eq." + orderId + "&limit=1";
            log.debug("Fetching order from: {}", uri);
            
            List<Map<String, Object>> result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            if (result != null && result.size() > 0) {
                return result.get(0);
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching order by id: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch order: " + e.getMessage(), e);
        }
    }

    /**
     * 주문 정보 업데이트
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> updateOrder(String orderId, Map<String, Object> updateData) {
        try {
            Map<String, Object>[] result = supabaseWebClient.patch()
                    .uri(supabaseUrl + "/rest/v1/orders?id=eq." + orderId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(updateData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.error("Error updating order: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update order: " + e.getMessage(), e);
        }
    }

    /**
     * 첫 번째 staff 사용자 조회 (작업 할당용)
     */
    @SuppressWarnings("unchecked")
    public String getFirstStaffUserId() {
        try {
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?role=eq.staff&limit=1&select=id")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (result != null && result.length > 0) {
                return (String) result[0].get("id");
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching staff user: {}", e.getMessage(), e);
            return null;
        }
    }
}

