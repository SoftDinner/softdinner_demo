package com.softdinner.service;

import com.softdinner.repository.DeliveryTaskRepository;
import com.softdinner.repository.OrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class DeliveryTaskService {

    private final DeliveryTaskRepository deliveryTaskRepository;
    private final OrderRepository orderRepository;

    public DeliveryTaskService(
            DeliveryTaskRepository deliveryTaskRepository,
            OrderRepository orderRepository
    ) {
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Staff의 배달 작업 목록 조회
     */
    public List<Map<String, Object>> getDeliveryTasksByStaff(String staffId) {
        try {
            List<Map<String, Object>> tasks = deliveryTaskRepository.getDeliveryTasksByStaff(staffId);
            
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
                    }
                    task.put("deliveryDate", order.get("delivery_date"));
                    task.put("deliveryAddress", order.get("delivery_address"));
                    task.put("orderId", order.get("id"));
                    
                    // 요리 상태 확인
                    String cookingStatus = (String) order.get("cooking_status");
                    task.put("cookingStatus", cookingStatus);
                    task.put("isCookingComplete", "completed".equals(cookingStatus));
                    
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
            log.error("Error getting delivery tasks: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get delivery tasks: " + e.getMessage(), e);
        }
    }

    /**
     * 배달 시작
     */
    public Map<String, Object> startDelivery(String taskId, String staffId) {
        try {
            // 작업 존재 및 권한 확인
            Map<String, Object> task = deliveryTaskRepository.getDeliveryTaskById(taskId);
            if (task == null) {
                throw new RuntimeException("Delivery task not found");
            }

            String taskStaffId = (String) task.get("staff_id");
            if (!staffId.equals(taskStaffId)) {
                throw new RuntimeException("Unauthorized: This task is not assigned to you");
            }

            String currentStatus = (String) task.get("status");
            if (!"pending".equals(currentStatus)) {
                throw new RuntimeException("Task is not in pending status");
            }

            // 상태 업데이트
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("status", "in_transit");
            updateData.put("started_at", Instant.now().toString());

            Map<String, Object> updatedTask = deliveryTaskRepository.updateDeliveryTask(taskId, updateData);
            
            // orders 테이블의 delivery_status도 업데이트
            String orderId = (String) task.get("order_id");
            if (orderId != null) {
                Map<String, Object> orderUpdate = Map.of("delivery_status", "in_transit");
                orderRepository.updateOrder(orderId, orderUpdate);
            }

            log.info("Delivery task {} started by staff {}", taskId, staffId);
            return updatedTask;
        } catch (Exception e) {
            log.error("Error starting delivery: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to start delivery: " + e.getMessage(), e);
        }
    }

    /**
     * 배달 완료
     */
    public Map<String, Object> completeDelivery(String taskId, String staffId) {
        try {
            // 작업 존재 및 권한 확인
            Map<String, Object> task = deliveryTaskRepository.getDeliveryTaskById(taskId);
            if (task == null) {
                throw new RuntimeException("Delivery task not found");
            }

            String taskStaffId = (String) task.get("staff_id");
            if (!staffId.equals(taskStaffId)) {
                throw new RuntimeException("Unauthorized: This task is not assigned to you");
            }

            String currentStatus = (String) task.get("status");
            if (!"in_transit".equals(currentStatus)) {
                throw new RuntimeException("Task is not in transit");
            }

            // 상태 업데이트
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("status", "completed");
            updateData.put("completed_at", Instant.now().toString());

            Map<String, Object> updatedTask = deliveryTaskRepository.updateDeliveryTask(taskId, updateData);
            
            // orders 테이블의 delivery_status도 업데이트
            String orderId = (String) task.get("order_id");
            if (orderId != null) {
                Map<String, Object> orderUpdate = Map.of("delivery_status", "completed");
                orderRepository.updateOrder(orderId, orderUpdate);
            }

            log.info("Delivery task {} completed by staff {}", taskId, staffId);
            return updatedTask;
        } catch (Exception e) {
            log.error("Error completing delivery: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to complete delivery: " + e.getMessage(), e);
        }
    }
}

