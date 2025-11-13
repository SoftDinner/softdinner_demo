package com.softdinner.service;

import com.softdinner.dto.*;
import com.softdinner.repository.IngredientRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;

    public IngredientService(IngredientRepository ingredientRepository) {
        this.ingredientRepository = ingredientRepository;
    }

    /**
     * 모든 재료 목록 조회
     */
    public List<IngredientDTO> getAllIngredients() {
        try {
            List<Map<String, Object>> ingredients = ingredientRepository.getAllIngredients();
            
            return ingredients.stream().map(this::mapToIngredientDTO).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting all ingredients: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get ingredients: " + e.getMessage(), e);
        }
    }

    /**
     * 재료 입고 처리
     */
    public IngredientDTO addStock(AddStockRequestDTO request, String staffId) {
        try {
            // 1. 현재 재료 정보 조회
            Map<String, Object> ingredient = ingredientRepository.getIngredientById(request.getIngredientId());
            if (ingredient == null) {
                throw new RuntimeException("Ingredient not found");
            }

            BigDecimal currentQuantity = new BigDecimal(ingredient.get("quantity").toString());
            BigDecimal addQuantity = request.getQuantity();
            BigDecimal newQuantity = currentQuantity.add(addQuantity);

            // 2. 재료 수량 업데이트
            Map<String, Object> updatedIngredient = ingredientRepository.updateIngredientQuantity(
                    request.getIngredientId(), newQuantity);

            // 3. 입출고 기록 저장
            Map<String, Object> logData = new HashMap<>();
            logData.put("ingredient_id", request.getIngredientId());
            logData.put("action", "in");
            logData.put("quantity", addQuantity.toString());
            logData.put("previous_quantity", currentQuantity.toString());
            logData.put("new_quantity", newQuantity.toString());
            logData.put("staff_id", staffId);
            if (request.getNotes() != null && !request.getNotes().isEmpty()) {
                logData.put("notes", request.getNotes());
            }

            ingredientRepository.createIngredientLog(logData);

            log.info("Stock added: ingredientId={}, quantity={}, newQuantity={}, staffId={}",
                    request.getIngredientId(), addQuantity, newQuantity, staffId);

            return mapToIngredientDTO(updatedIngredient);
        } catch (Exception e) {
            log.error("Error adding stock: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to add stock: " + e.getMessage(), e);
        }
    }

    /**
     * 입출고 기록 조회
     */
    public List<IngredientLogDTO> getIngredientLogs(String ingredientId, Integer limit) {
        try {
            List<Map<String, Object>> logs = ingredientRepository.getIngredientLogs(ingredientId, limit);
            
            return logs.stream().map(log -> {
                String staffId = (String) log.get("staff_id");
                String staffName = null;
                if (staffId != null) {
                    staffName = ingredientRepository.getUserNameById(staffId);
                }

                String logIngredientId = (String) log.get("ingredient_id");
                String ingredientName = null;
                String ingredientUnit = null;
                if (logIngredientId != null) {
                    Map<String, Object> ingredient = ingredientRepository.getIngredientById(logIngredientId);
                    if (ingredient != null) {
                        ingredientName = (String) ingredient.get("name");
                        ingredientUnit = (String) ingredient.get("unit");
                    }
                }

                return IngredientLogDTO.builder()
                        .id((String) log.get("id"))
                        .ingredientId(logIngredientId)
                        .ingredientName(ingredientName)
                        .ingredientUnit(ingredientUnit)
                        .action((String) log.get("action"))
                        .quantity(new BigDecimal(log.get("quantity").toString()))
                        .previousQuantity(new BigDecimal(log.get("previous_quantity").toString()))
                        .newQuantity(new BigDecimal(log.get("new_quantity").toString()))
                        .staffId(staffId)
                        .staffName(staffName)
                        .orderId((String) log.get("order_id"))
                        .notes((String) log.get("notes"))
                        .createdAt(parseDateTime(log.get("created_at")))
                        .build();
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting ingredient logs: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get ingredient logs: " + e.getMessage(), e);
        }
    }

    /**
     * Map을 IngredientDTO로 변환
     */
    private IngredientDTO mapToIngredientDTO(Map<String, Object> ingredient) {
        return IngredientDTO.builder()
                .id((String) ingredient.get("id"))
                .name((String) ingredient.get("name"))
                .quantity(new BigDecimal(ingredient.get("quantity").toString()))
                .unit((String) ingredient.get("unit"))
                .category((String) ingredient.get("category"))
                .createdAt(parseDateTime(ingredient.get("created_at")))
                .updatedAt(parseDateTime(ingredient.get("updated_at")))
                .build();
    }

    /**
     * 날짜/시간 파싱 (String 또는 Instant)
     */
    private LocalDateTime parseDateTime(Object dateObj) {
        if (dateObj == null) {
            return null;
        }
        
        if (dateObj instanceof java.time.Instant) {
            return ((java.time.Instant) dateObj)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDateTime();
        } else if (dateObj instanceof String) {
            return java.time.Instant.parse((String) dateObj)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDateTime();
        }
        
        return null;
    }
}

