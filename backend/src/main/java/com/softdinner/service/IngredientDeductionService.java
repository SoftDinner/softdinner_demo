package com.softdinner.service;

import com.softdinner.repository.CookingTaskRepository;
import com.softdinner.repository.IngredientRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
public class IngredientDeductionService {

    private final CookingTaskRepository cookingTaskRepository;
    private final IngredientRepository ingredientRepository;

    public IngredientDeductionService(
            CookingTaskRepository cookingTaskRepository,
            IngredientRepository ingredientRepository
    ) {
        this.cookingTaskRepository = cookingTaskRepository;
        this.ingredientRepository = ingredientRepository;
    }

    /**
     * 주문 완료 시 재료 자동 차감
     * 커스터마이징을 포함한 실제 사용량 계산
     */
    public DeductionResult deductIngredientsForOrder(String orderId, String staffId) {
        try {
            log.info("Starting ingredient deduction for order: {}", orderId);

            // 1. 주문 정보 조회
            Map<String, Object> order = cookingTaskRepository.getOrderById(orderId);
            if (order == null) {
                throw new RuntimeException("Order not found: " + orderId);
            }

            // 2. order_items에서 디너 ID와 커스터마이징 정보 추출
            @SuppressWarnings("unchecked")
            Map<String, Object> orderItems = (Map<String, Object>) order.get("order_items");
            if (orderItems == null) {
                throw new RuntimeException("Order items not found");
            }

            String dinnerId = (String) orderItems.get("dinner_id");
            @SuppressWarnings("unchecked")
            Map<String, Object> customizations = (Map<String, Object>) orderItems.getOrDefault("customizations", Map.of());

            // 3. 디너의 기본 메뉴 항목 조회
            List<Map<String, Object>> menuItems = cookingTaskRepository.getMenuItemsByDinnerId(dinnerId);
            if (menuItems.isEmpty()) {
                log.warn("No menu items found for dinner: {}", dinnerId);
                return new DeductionResult(Collections.emptyList(), "No menu items found");
            }

            // 4. 재료별 차감량 계산 및 메뉴 항목별 정보 저장
            Map<String, BigDecimal> ingredientDeductions = new HashMap<>();
            Map<String, List<Map<String, Object>>> ingredientMenuItems = new HashMap<>(); // 재료별 메뉴 항목 정보
            List<DeductionDetail> details = new ArrayList<>();

            for (Map<String, Object> menuItem : menuItems) {
                String menuItemId = menuItem.get("id").toString();
                String menuItemName = (String) menuItem.get("name");
                String menuItemUnit = (String) menuItem.getOrDefault("unit", "");
                BigDecimal defaultQuantity = new BigDecimal(menuItem.get("default_quantity").toString());
                
                // 커스터마이징에서 실제 수량 확인
                BigDecimal actualQuantity = defaultQuantity;
                if (customizations.containsKey(menuItemId)) {
                    Object customQty = customizations.get(menuItemId);
                    if (customQty instanceof Number) {
                        actualQuantity = new BigDecimal(customQty.toString());
                    } else if (customQty instanceof String) {
                        actualQuantity = new BigDecimal((String) customQty);
                    }
                }

                // 수량이 0이면 스킵
                if (actualQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                // 재료 정보 확인
                Object ingredientIdObj = menuItem.get("ingredient_id");
                if (ingredientIdObj == null) {
                    log.debug("Menu item {} has no ingredient_id, skipping", menuItemName);
                    continue;
                }

                String ingredientId = ingredientIdObj.toString();
                BigDecimal ingredientQuantityPerUnit = new BigDecimal(
                    menuItem.getOrDefault("ingredient_quantity_per_unit", "1").toString()
                );

                // 실제 차감량 계산: 메뉴 항목 수량 × 단위당 재료 수량
                BigDecimal deductionAmount = actualQuantity.multiply(ingredientQuantityPerUnit);

                // 재료별로 누적
                ingredientDeductions.merge(ingredientId, deductionAmount, BigDecimal::add);

                // 재료별 메뉴 항목 정보 저장
                Map<String, Object> menuItemInfo = new HashMap<>();
                menuItemInfo.put("name", menuItemName);
                menuItemInfo.put("quantity", actualQuantity);
                menuItemInfo.put("unit", menuItemUnit);
                menuItemInfo.put("ingredientPerUnit", ingredientQuantityPerUnit);
                ingredientMenuItems.computeIfAbsent(ingredientId, k -> new ArrayList<>()).add(menuItemInfo);

                details.add(new DeductionDetail(
                    ingredientId,
                    menuItemName,
                    actualQuantity,
                    ingredientQuantityPerUnit,
                    deductionAmount
                ));

                log.debug("Menu item: {}, Quantity: {}, Ingredient per unit: {}, Deduction: {}",
                    menuItemName, actualQuantity, ingredientQuantityPerUnit, deductionAmount);
            }

            // 5. 각 재료 수량 차감 및 로그 기록
            List<String> errors = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : ingredientDeductions.entrySet()) {
                String ingredientId = entry.getKey();
                BigDecimal deductionAmount = entry.getValue();
                List<Map<String, Object>> menuItemsForIngredient = ingredientMenuItems.getOrDefault(ingredientId, new ArrayList<>());

                try {
                    // 현재 재고 조회
                    Map<String, Object> ingredient = ingredientRepository.getIngredientById(ingredientId);
                    if (ingredient == null) {
                        errors.add("Ingredient not found: " + ingredientId);
                        continue;
                    }

                    BigDecimal currentQuantity = new BigDecimal(ingredient.get("quantity").toString());
                    BigDecimal newQuantity = currentQuantity.subtract(deductionAmount);

                    if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                        log.warn("Insufficient stock for ingredient {}: current={}, required={}",
                            ingredient.get("name"), currentQuantity, deductionAmount);
                        errors.add("재고 부족: " + ingredient.get("name") + " (현재: " + currentQuantity + ", 필요: " + deductionAmount + ")");
                        continue;
                    }

                    // 재고 업데이트
                    ingredientRepository.updateIngredientQuantity(ingredientId, newQuantity);

                    // 메뉴 항목별 정보를 notes에 포함
                    StringBuilder notesBuilder = new StringBuilder();
                    for (Map<String, Object> menuItemInfo : menuItemsForIngredient) {
                        String menuItemName = (String) menuItemInfo.get("name");
                        BigDecimal menuItemQty = (BigDecimal) menuItemInfo.get("quantity");
                        String menuItemUnit = (String) menuItemInfo.get("unit");
                        BigDecimal ingredientPerUnit = (BigDecimal) menuItemInfo.get("ingredientPerUnit");
                        BigDecimal totalDeduction = menuItemQty.multiply(ingredientPerUnit);
                        
                        if (notesBuilder.length() > 0) {
                            notesBuilder.append(", ");
                        }
                        
                        String ingredientName = (String) ingredient.get("name");
                        String ingredientUnit = (String) ingredient.get("unit");
                        
                        // 포트 단위인 경우 특별 표시 (예: 커피 1포트=커피5잔 차감)
                        if ("포트".equals(menuItemUnit) && ingredientPerUnit.compareTo(BigDecimal.ONE) > 0) {
                            notesBuilder.append(String.format("%s %d%s=%s%d%s 차감", 
                                menuItemName, menuItemQty.intValue(), menuItemUnit,
                                ingredientName, totalDeduction.intValue(), ingredientUnit));
                        }
                        // 스테이크, 베이컨, 샐러드인 경우 특별 표시 (예: 스테이크 1개=고기 0.2kg 차감, 베이컨 1개=고기 0.1kg 차감, 샐러드 1개=채소 0.2kg 차감)
                        else if (("스테이크".equals(menuItemName) || "베이컨".equals(menuItemName) || "샐러드".equals(menuItemName)) 
                                && ingredientPerUnit.compareTo(BigDecimal.ONE) < 0) {
                            notesBuilder.append(String.format("%s %d%s=%s%.1f%s 차감", 
                                menuItemName, menuItemQty.intValue(), menuItemUnit,
                                ingredientName, totalDeduction.doubleValue(), ingredientUnit));
                        }
                        // 와인인 경우 특별 표시 (예: 와인 1잔=와인 0.2병 차감, 와인 5잔=와인 1병 차감)
                        else if ("와인".equals(menuItemName) && "병".equals(ingredientUnit) && ingredientPerUnit.compareTo(BigDecimal.ONE) < 0) {
                            notesBuilder.append(String.format("%s %d%s=%s%.1f%s 차감", 
                                menuItemName, menuItemQty.intValue(), menuItemUnit,
                                ingredientName, totalDeduction.doubleValue(), ingredientUnit));
                        } else {
                            notesBuilder.append(String.format("%s %d%s 차감", 
                                menuItemName, totalDeduction.intValue(), ingredientUnit));
                        }
                    }

                    // 출고 로그 기록
                    Map<String, Object> logData = new HashMap<>();
                    logData.put("ingredient_id", ingredientId);
                    logData.put("action", "out");
                    logData.put("quantity", deductionAmount.toString());
                    logData.put("previous_quantity", currentQuantity.toString());
                    logData.put("new_quantity", newQuantity.toString());
                    logData.put("staff_id", staffId);
                    logData.put("order_id", orderId);
                    logData.put("notes", notesBuilder.toString());

                    ingredientRepository.createIngredientLog(logData);

                    log.info("Deducted {} from ingredient {} ({} -> {})",
                        deductionAmount, ingredient.get("name"), currentQuantity, newQuantity);

                } catch (Exception e) {
                    log.error("Error deducting ingredient {}: {}", ingredientId, e.getMessage(), e);
                    errors.add("재료 차감 실패: " + ingredientId + " - " + e.getMessage());
                }
            }

            String message = errors.isEmpty() 
                ? "재료 차감 완료" 
                : "재료 차감 완료 (일부 오류: " + String.join(", ", errors) + ")";

            return new DeductionResult(details, message);
        } catch (Exception e) {
            log.error("Error in deductIngredientsForOrder: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to deduct ingredients: " + e.getMessage(), e);
        }
    }

    /**
     * 차감 결과 DTO
     */
    public static class DeductionResult {
        private final List<DeductionDetail> details;
        private final String message;

        public DeductionResult(List<DeductionDetail> details, String message) {
            this.details = details;
            this.message = message;
        }

        public List<DeductionDetail> getDetails() {
            return details;
        }

        public String getMessage() {
            return message;
        }
    }

    /**
     * 차감 상세 정보
     */
    public static class DeductionDetail {
        private final String ingredientId;
        private final String menuItemName;
        private final BigDecimal menuItemQuantity;
        private final BigDecimal ingredientPerUnit;
        private final BigDecimal totalDeduction;

        public DeductionDetail(String ingredientId, String menuItemName, 
                              BigDecimal menuItemQuantity, BigDecimal ingredientPerUnit, 
                              BigDecimal totalDeduction) {
            this.ingredientId = ingredientId;
            this.menuItemName = menuItemName;
            this.menuItemQuantity = menuItemQuantity;
            this.ingredientPerUnit = ingredientPerUnit;
            this.totalDeduction = totalDeduction;
        }

        public String getIngredientId() { return ingredientId; }
        public String getMenuItemName() { return menuItemName; }
        public BigDecimal getMenuItemQuantity() { return menuItemQuantity; }
        public BigDecimal getIngredientPerUnit() { return ingredientPerUnit; }
        public BigDecimal getTotalDeduction() { return totalDeduction; }
    }
}

