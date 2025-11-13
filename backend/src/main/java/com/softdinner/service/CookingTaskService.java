package com.softdinner.service;

import com.softdinner.repository.CookingTaskRepository;
import com.softdinner.repository.OrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class CookingTaskService {

    private final CookingTaskRepository cookingTaskRepository;
    private final OrderRepository orderRepository;
    private final IngredientDeductionService ingredientDeductionService;

    public CookingTaskService(
            CookingTaskRepository cookingTaskRepository,
            OrderRepository orderRepository,
            IngredientDeductionService ingredientDeductionService
    ) {
        this.cookingTaskRepository = cookingTaskRepository;
        this.orderRepository = orderRepository;
        this.ingredientDeductionService = ingredientDeductionService;
    }

    /**
     * Staff의 요리 작업 목록 조회
     */
    public List<Map<String, Object>> getCookingTasksByStaff(String staffId) {
        try {
            List<Map<String, Object>> tasks = cookingTaskRepository.getCookingTasksByStaff(staffId);
            
            // 주문 정보를 포함하여 포맷팅
            return tasks.stream().map(task -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> order = (Map<String, Object>) task.get("orders");
                if (order != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> orderItems = (Map<String, Object>) order.get("order_items");
                    if (orderItems != null) {
                        task.put("dinnerName", orderItems.get("dinner_name"));
                        task.put("styleName", orderItems.get("style_name"));
                        task.put("customizations", orderItems.get("customizations"));
                    }
                    task.put("deliveryDate", order.get("delivery_date"));
                    task.put("deliveryAddress", order.get("delivery_address"));
                    task.put("orderId", order.get("id"));
                    
                    // 고객 정보 조회
                    String userId = (String) order.get("user_id");
                    if (userId != null) {
                        Map<String, Object> user = orderRepository.getUserById(userId);
                        if (user != null) {
                            task.put("customerName", user.get("full_name"));
                        }
                    }
                }
                return task;
            }).toList();
        } catch (Exception e) {
            log.error("Error getting cooking tasks: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get cooking tasks: " + e.getMessage(), e);
        }
    }

    /**
     * 요리 시작 (재료 자동 차감 포함)
     */
    public Map<String, Object> startCooking(String taskId, String staffId) {
        try {
            // 작업 존재 및 권한 확인
            Map<String, Object> task = cookingTaskRepository.getCookingTaskById(taskId);
            if (task == null) {
                throw new RuntimeException("Cooking task not found");
            }

            String taskStaffId = (String) task.get("staff_id");
            if (!staffId.equals(taskStaffId)) {
                throw new RuntimeException("Unauthorized: This task is not assigned to you");
            }

            String currentStatus = (String) task.get("status");
            if (!"waiting".equals(currentStatus)) {
                throw new RuntimeException("Task is not in waiting status");
            }

            String orderId = (String) task.get("order_id");
            if (orderId == null) {
                throw new RuntimeException("Order ID not found in task");
            }

            // 재료 자동 차감 (요리 시작 시)
            IngredientDeductionService.DeductionResult deductionResult = 
                ingredientDeductionService.deductIngredientsForOrder(orderId, staffId);
            
            log.info("Ingredient deduction completed: {}", deductionResult.getMessage());

            // 상태 업데이트
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("status", "in_progress");
            updateData.put("started_at", Instant.now().toString());

            Map<String, Object> updatedTask = cookingTaskRepository.updateCookingTask(taskId, updateData);
            
            // orders 테이블의 cooking_status도 업데이트
            if (orderId != null) {
                Map<String, Object> orderUpdate = Map.of("cooking_status", "in_progress");
                orderRepository.updateOrder(orderId, orderUpdate);
            }

            log.info("Cooking task {} started by staff {}", taskId, staffId);
            
            // 차감 결과를 응답에 포함
            updatedTask.put("deductionResult", Map.of(
                "message", deductionResult.getMessage(),
                "details", deductionResult.getDetails()
            ));

            return updatedTask;
        } catch (Exception e) {
            log.error("Error starting cooking: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to start cooking: " + e.getMessage(), e);
        }
    }

    /**
     * 요리 완료 (재료 자동 차감 포함)
     */
    public Map<String, Object> completeCooking(String taskId, String staffId) {
        try {
            // 작업 존재 및 권한 확인
            Map<String, Object> task = cookingTaskRepository.getCookingTaskById(taskId);
            if (task == null) {
                throw new RuntimeException("Cooking task not found");
            }

            String taskStaffId = (String) task.get("staff_id");
            if (!staffId.equals(taskStaffId)) {
                throw new RuntimeException("Unauthorized: This task is not assigned to you");
            }

            String currentStatus = (String) task.get("status");
            if (!"in_progress".equals(currentStatus)) {
                throw new RuntimeException("Task is not in progress");
            }

            String orderId = (String) task.get("order_id");
            if (orderId == null) {
                throw new RuntimeException("Order ID not found in task");
            }

            // 상태 업데이트 (재료 차감은 요리 시작 시 이미 완료됨)
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("status", "completed");
            updateData.put("completed_at", Instant.now().toString());

            Map<String, Object> updatedTask = cookingTaskRepository.updateCookingTask(taskId, updateData);
            
            // orders 테이블의 cooking_status도 업데이트
            if (orderId != null) {
                Map<String, Object> orderUpdate = Map.of("cooking_status", "completed");
                orderRepository.updateOrder(orderId, orderUpdate);
            }

            log.info("Cooking task {} completed by staff {}", taskId, staffId);
            
            return updatedTask;
        } catch (Exception e) {
            log.error("Error completing cooking: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to complete cooking: " + e.getMessage(), e);
        }
    }
}

