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
public class DeliveryTaskRepository {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public DeliveryTaskRepository(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    /**
     * Staff의 배달 작업 목록 조회
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getDeliveryTasksByStaff(String staffId) {
        try {
            String uri = supabaseUrl + "/rest/v1/delivery_tasks?staff_id=eq." + staffId 
                    + "&order=created_at.desc"
                    + "&select=*,orders(*)";
            
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null ? List.of(result) : List.of();
        } catch (Exception e) {
            log.error("Error fetching delivery tasks: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch delivery tasks: " + e.getMessage(), e);
        }
    }

    /**
     * 배달 작업 조회 (ID로)
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDeliveryTaskById(String taskId) {
        try {
            String uri = supabaseUrl + "/rest/v1/delivery_tasks?id=eq." + taskId 
                    + "&select=*,orders(*)";
            
            Map<String, Object>[] result = supabaseWebClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.error("Error fetching delivery task: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch delivery task: " + e.getMessage(), e);
        }
    }

    /**
     * 배달 작업 상태 업데이트
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> updateDeliveryTask(String taskId, Map<String, Object> updateData) {
        try {
            Map<String, Object>[] result = supabaseWebClient.patch()
                    .uri(supabaseUrl + "/rest/v1/delivery_tasks?id=eq." + taskId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(updateData)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), response -> {
                        return response.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("Error updating delivery task: {} - {}", response.statusCode(), body);
                                    String statusText = response.statusCode().toString();
                                    byte[] bodyBytes = body != null ? body.getBytes() : new byte[0];
                                    return reactor.core.publisher.Mono.error(WebClientResponseException.create(
                                            response.statusCode().value(),
                                            statusText,
                                            response.headers().asHttpHeaders(),
                                            bodyBytes,
                                            java.nio.charset.StandardCharsets.UTF_8
                                    ));
                                });
                    })
                    .bodyToMono(Map[].class)
                    .block();

            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.error("Error updating delivery task: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update delivery task: " + e.getMessage(), e);
        }
    }

    /**
     * 배달 작업 생성
     */
    @SuppressWarnings({"unchecked", "null"})
    public Map<String, Object> createDeliveryTask(Map<String, Object> taskData) {
        try {
            Map<String, Object>[] result = supabaseWebClient.post()
                    .uri(supabaseUrl + "/rest/v1/delivery_tasks")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(taskData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return result != null && result.length > 0 ? result[0] : null;
        } catch (Exception e) {
            log.error("Error creating delivery task: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create delivery task: " + e.getMessage(), e);
        }
    }
}

