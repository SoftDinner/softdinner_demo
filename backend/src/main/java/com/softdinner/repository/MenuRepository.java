package com.softdinner.repository;

import lombok.extern.slf4j.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.*;
import org.springframework.web.reactive.function.client.*;

import java.util.*;

@Slf4j
@Repository
public class MenuRepository {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public MenuRepository(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findAllDinners() {
        try {
            Map<String, Object>[] dinners = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/dinners")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return dinners != null ? Arrays.asList(dinners) : new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching dinners: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> findDinnerById(String dinnerId) {
        try {
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
            
            Map<String, Object>[] dinners = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/dinners?" + queryParam)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (dinners != null && dinners.length > 0) {
                return dinners[0];
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching dinner by id: {}", e.getMessage(), e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findMenuItemsByDinnerId(String dinnerId) {
        try {
            // UUID 형식인지 확인
            boolean isUuid = dinnerId != null && dinnerId.length() == 36 && dinnerId.contains("-");
            
            String actualDinnerId = dinnerId;
            
            // UUID가 아니면 이름으로 dinner를 먼저 조회해서 UUID를 얻음
            if (!isUuid) {
                String dbName = mapDinnerNameToDb(dinnerId);
                Map<String, Object> dinner = findDinnerByName(dbName);
                if (dinner != null) {
                    actualDinnerId = (String) dinner.get("id");
                } else {
                    log.warn("Dinner not found by name: {}", dbName);
                    return new ArrayList<>();
                }
            }
            
            String queryUrl = supabaseUrl + "/rest/v1/menu_items?dinner_id=eq." + actualDinnerId;
            log.debug("Fetching menu items from Supabase: {}", queryUrl);
            
            Map<String, Object>[] items = supabaseWebClient.get()
                    .uri(queryUrl)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (items != null) {
                log.debug("Supabase returned {} menu items for dinner_id={}", items.length, actualDinnerId);
                // 중복 ID 확인
                Set<String> seenIds = new HashSet<>();
                for (Map<String, Object> item : items) {
                    if (item != null && item.get("id") != null) {
                        String itemId = item.get("id").toString();
                        if (seenIds.contains(itemId)) {
                            log.warn("⚠️ 중복된 menu_item ID 발견: {} (dinner_id={})", itemId, actualDinnerId);
                        } else {
                            seenIds.add(itemId);
                        }
                    }
                }
            }

            return items != null ? Arrays.asList(items) : new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching menu items: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 이름으로 디너 조회
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> findDinnerByName(String name) {
        try {
            Map<String, Object>[] dinners = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/dinners?name=eq." + name)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (dinners != null && dinners.length > 0) {
                return dinners[0];
            }
            return null;
        } catch (Exception e) {
            log.error("Error fetching dinner by name: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * 프론트엔드에서 사용하는 디너 이름을 데이터베이스의 실제 이름으로 매핑
     */
    private String mapDinnerNameToDb(String frontendName) {
        if (frontendName == null) {
            return null;
        }
        
        return switch (frontendName.toLowerCase()) {
            case "valentine" -> "Valentine Dinner";
            case "french" -> "French Dinner";
            case "english" -> "English Dinner";
            case "champagne" -> "Champagne Feast";
            default -> frontendName;
        };
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findAllStyles() {
        try {
            Map<String, Object>[] styles = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/styles")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            return styles != null ? Arrays.asList(styles) : new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching styles: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}

