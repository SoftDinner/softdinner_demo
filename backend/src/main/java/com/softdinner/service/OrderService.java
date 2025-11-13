package com.softdinner.service;

import com.softdinner.dto.*;
import com.softdinner.repository.CookingTaskRepository;
import com.softdinner.repository.DeliveryTaskRepository;
import com.softdinner.repository.MenuRepository;
import com.softdinner.repository.OrderRepository;
import com.softdinner.service.LoyaltyService.LoyaltyUpdateResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final LoyaltyService loyaltyService;
    private final CookingTaskRepository cookingTaskRepository;
    private final DeliveryTaskRepository deliveryTaskRepository;
    private final MenuRepository menuRepository;

    public OrderService(
            OrderRepository orderRepository, 
            LoyaltyService loyaltyService,
            CookingTaskRepository cookingTaskRepository,
            DeliveryTaskRepository deliveryTaskRepository,
            MenuRepository menuRepository
    ) {
        this.orderRepository = orderRepository;
        this.loyaltyService = loyaltyService;
        this.cookingTaskRepository = cookingTaskRepository;
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.menuRepository = menuRepository;
    }

    /**
     * 주문 생성
     */
    public OrderResponseDTO createOrder(CreateOrderRequestDTO request, String userId) {
        try {
            // 1. 사용자 정보 조회
            Map<String, Object> user = orderRepository.getUserById(userId);
            if (user == null) {
                throw new RuntimeException("User not found");
            }

            String currentTier = (String) user.getOrDefault("loyalty_tier", "bronze");
            Integer currentTotalOrders = ((Number) user.getOrDefault("total_orders", 0)).intValue();
            BigDecimal currentTotalSpent = new BigDecimal(user.getOrDefault("total_spent", 0).toString());

            // 2. 디너 및 스타일 정보 조회
            Map<String, Object> dinner = orderRepository.getDinnerById(request.getDinnerId());
            if (dinner == null) {
                throw new RuntimeException("Dinner not found");
            }

            Map<String, Object> style = orderRepository.getStyleById(request.getStyleId());
            if (style == null) {
                throw new RuntimeException("Style not found");
            }

            // 3. 가격 계산
            BigDecimal basePrice = new BigDecimal(dinner.get("base_price").toString());
            BigDecimal stylePriceModifier = new BigDecimal(style.get("price_modifier").toString());
            
            // 커스터마이징 추가 가격 계산 (menu_items에서 계산)
            BigDecimal customizationPrice = BigDecimal.ZERO;
            if (request.getCustomizations() != null && !request.getCustomizations().isEmpty()) {
                String dinnerIdForMenu = (String) dinner.get("id");
                List<Map<String, Object>> menuItems = menuRepository.findMenuItemsByDinnerId(dinnerIdForMenu);
                
                // menu_items를 Map으로 변환 (빠른 조회를 위해)
                Map<String, Map<String, Object>> menuItemMap = new HashMap<>();
                for (Map<String, Object> item : menuItems) {
                    String itemId = (String) item.get("id");
                    if (itemId != null) {
                        menuItemMap.put(itemId, item);
                    }
                }
                
                // 커스터마이징 가격 계산 (기본 수량 제외, 추가/감소분 반영)
                for (Map.Entry<String, Integer> entry : request.getCustomizations().entrySet()) {
                    String menuItemId = entry.getKey();
                    Integer currentQuantity = entry.getValue();
                    
                    Map<String, Object> menuItem = menuItemMap.get(menuItemId);
                    if (menuItem != null) {
                        // 기본 수량 가져오기
                        Object defaultQuantityObj = menuItem.get("default_quantity");
                        Integer defaultQuantity = defaultQuantityObj != null ? 
                            Integer.parseInt(defaultQuantityObj.toString()) : 0;
                        
                        // 기본 수량과의 차이 계산 (추가분은 더하고, 감소분은 빼기)
                        int quantityDiff = currentQuantity - defaultQuantity;
                        
                        if (quantityDiff != 0) {
                            Object additionalPriceObj = menuItem.get("additional_price");
                            if (additionalPriceObj != null) {
                                BigDecimal additionalPrice = new BigDecimal(additionalPriceObj.toString());
                                BigDecimal itemTotal = additionalPrice.multiply(new BigDecimal(quantityDiff));
                                customizationPrice = customizationPrice.add(itemTotal);
                            }
                        }
                    }
                }
            }

            BigDecimal subtotal = basePrice.add(stylePriceModifier).add(customizationPrice);

            // 4. 단골 할인 계산
            BigDecimal discountRate = loyaltyService.getDiscountRateByTier(currentTier);
            BigDecimal discountAmount = subtotal.multiply(discountRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal finalPrice = subtotal.subtract(discountAmount);

            // 5. 주문 데이터 구성
            Map<String, Object> orderItems = new HashMap<>();
            // dinner와 style에서 실제 UUID 가져오기
            orderItems.put("dinner_id", dinner.get("id")); // 실제 UUID 사용
            orderItems.put("dinner_name", dinner.get("name"));
            orderItems.put("style_id", style.get("id")); // 실제 UUID 사용
            orderItems.put("style_name", style.get("name"));
            orderItems.put("customizations", request.getCustomizations() != null ? request.getCustomizations() : Map.of());
            // 주문 시점의 등급 정보 저장 (나중에 주문 완료 페이지에서 표시용)
            orderItems.put("loyalty_tier", currentTier);
            orderItems.put("discount_rate", discountRate.doubleValue());

            Map<String, Object> orderData = new HashMap<>();
            orderData.put("user_id", userId);
            // Instant를 ISO 8601 문자열로 변환 (Supabase가 TIMESTAMP WITH TIME ZONE을 기대)
            String deliveryDateStr = request.getDeliveryDate().atZone(ZoneId.systemDefault()).toInstant().toString();
            orderData.put("delivery_date", deliveryDateStr);
            orderData.put("delivery_address", request.getDeliveryAddress());
            orderData.put("order_items", orderItems);
            // BigDecimal을 문자열로 변환 (Supabase DECIMAL 타입이 문자열을 기대할 수 있음)
            orderData.put("total_price", subtotal.toString());
            orderData.put("discount_applied", discountAmount.toString());
            orderData.put("final_price", finalPrice.toString());
            orderData.put("payment_status", "completed"); // 간단한 버전에서는 바로 완료 처리
            orderData.put("delivery_status", "pending");
            orderData.put("cooking_status", "waiting");
            
            log.debug("Creating order with data: {}", orderData);

            // 6. 주문 저장
            Map<String, Object> savedOrder = orderRepository.createOrder(orderData);
            if (savedOrder == null) {
                throw new RuntimeException("Failed to create order");
            }

            String orderId = (String) savedOrder.get("id");

            // 6-1. 요리 작업 생성 (첫 번째 staff 사용자에게 할당)
            try {
                String staffId = orderRepository.getFirstStaffUserId();
                if (staffId != null) {
                    Map<String, Object> cookingTaskData = new HashMap<>();
                    cookingTaskData.put("order_id", orderId);
                    cookingTaskData.put("staff_id", staffId);
                    cookingTaskData.put("status", "waiting");
                    
                    cookingTaskRepository.createCookingTask(cookingTaskData);
                    log.info("Cooking task created for order {} assigned to staff {}", orderId, staffId);
                } else {
                    log.warn("No staff user found, cooking task not created for order {}", orderId);
                }
            } catch (Exception e) {
                log.warn("Failed to create cooking task for order {}: {}", orderId, e.getMessage());
                // 요리 작업 생성 실패해도 주문은 계속 진행
            }

            // 6-2. 배달 작업 생성 (요리 완료 후 배달 가능, 일단 주문 생성 시 함께 생성)
            try {
                String staffId = orderRepository.getFirstStaffUserId();
                if (staffId != null) {
                    Map<String, Object> deliveryTaskData = new HashMap<>();
                    deliveryTaskData.put("order_id", orderId);
                    deliveryTaskData.put("staff_id", staffId);
                    deliveryTaskData.put("customer_address", request.getDeliveryAddress());
                    deliveryTaskData.put("status", "pending");
                    
                    deliveryTaskRepository.createDeliveryTask(deliveryTaskData);
                    log.info("Delivery task created for order {} assigned to staff {}", orderId, staffId);
                } else {
                    log.warn("No staff user found, delivery task not created for order {}", orderId);
                }
            } catch (Exception e) {
                log.warn("Failed to create delivery task for order {}: {}", orderId, e.getMessage());
                // 배달 작업 생성 실패해도 주문은 계속 진행
            }

            // 7. 사용자 통계 업데이트
            int newTotalOrders = currentTotalOrders + 1;
            BigDecimal newTotalSpent = currentTotalSpent.add(finalPrice);

            Map<String, Object> userUpdate = new HashMap<>();
            userUpdate.put("total_orders", newTotalOrders);
            userUpdate.put("total_spent", newTotalSpent);

            orderRepository.updateUser(userId, userUpdate);

            // 8. 단골 등급 업그레이드 확인
            LoyaltyUpdateResult loyaltyUpdate = loyaltyService.updateLoyaltyTier(
                    userId, newTotalOrders, newTotalSpent);

            // 9. 응답 구성
            OrderResponseDTO.DiscountInfoDTO discountInfo = OrderResponseDTO.DiscountInfoDTO.builder()
                    .tier(currentTier)
                    .discountRate(discountRate)
                    .discountAmount(discountAmount)
                    .build();

            OrderResponseDTO.LoyaltyUpdateResultDTO loyaltyUpdateDTO = null;
            if (loyaltyUpdate != null) {
                loyaltyUpdateDTO = OrderResponseDTO.LoyaltyUpdateResultDTO.builder()
                        .upgraded(loyaltyUpdate.getUpgraded())
                        .oldTier(loyaltyUpdate.getOldTier())
                        .newTier(loyaltyUpdate.getNewTier())
                        .message(loyaltyUpdate.getMessage())
                        .build();
            }

            String message = "주문이 성공적으로 생성되었습니다.";
            if (loyaltyUpdate != null && loyaltyUpdate.getUpgraded()) {
                message += " " + loyaltyUpdate.getMessage();
            }

            return OrderResponseDTO.builder()
                    .id((String) savedOrder.get("id"))
                    .userId(userId)
                    .orderDate(LocalDateTime.now())
                    .deliveryDate(request.getDeliveryDate())
                    .deliveryAddress(request.getDeliveryAddress())
                    .orderItems(orderItems)
                    .totalPrice(subtotal)
                    .discountApplied(discountAmount)
                    .finalPrice(finalPrice)
                    .paymentStatus("completed")
                    .deliveryStatus("pending")
                    .cookingStatus("waiting")
                    .discount(discountInfo)
                    .loyaltyUpdate(loyaltyUpdateDTO)
                    .message(message)
                    .build();

        } catch (Exception e) {
            log.error("Error creating order: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create order: " + e.getMessage());
        }
    }

    /**
     * 사용자의 주문 목록 조회
     */
    @SuppressWarnings("unchecked")
    public List<OrderHistoryDTO> getUserOrders(String userId) {
        try {
            List<Map<String, Object>> orders = orderRepository.getUserOrders(userId);
            log.debug("Retrieved {} orders for user {}", orders.size(), userId);
            
            return orders.stream().map(order -> {
                log.debug("Processing order: {}", order.get("id"));
                Map<String, Object> orderItems = (Map<String, Object>) order.get("order_items");
                log.debug("Order items from DB: {}", orderItems);
                
                String dinnerName = orderItems != null ? (String) orderItems.get("dinner_name") : null;
                String styleName = orderItems != null ? (String) orderItems.get("style_name") : null;
                
                log.debug("Extracted dinnerName: {}, styleName: {}", dinnerName, styleName);
                
                // LocalDateTime 변환 (Supabase에서 문자열로 반환됨)
                LocalDateTime orderDate = null;
                LocalDateTime deliveryDate = null;
                if (order.get("order_date") != null) {
                    Object orderDateObj = order.get("order_date");
                    if (orderDateObj instanceof java.time.Instant) {
                        orderDate = ((java.time.Instant) orderDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    } else if (orderDateObj instanceof String) {
                        // ISO 8601 문자열 파싱
                        orderDate = java.time.Instant.parse((String) orderDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    }
                }
                if (order.get("delivery_date") != null) {
                    Object deliveryDateObj = order.get("delivery_date");
                    if (deliveryDateObj instanceof java.time.Instant) {
                        deliveryDate = ((java.time.Instant) deliveryDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    } else if (deliveryDateObj instanceof String) {
                        // ISO 8601 문자열 파싱
                        deliveryDate = java.time.Instant.parse((String) deliveryDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    }
                }
                
                return OrderHistoryDTO.builder()
                        .id((String) order.get("id"))
                        .orderDate(orderDate)
                        .deliveryDate(deliveryDate)
                        .deliveryAddress((String) order.get("delivery_address"))
                        .orderItems(orderItems)
                        .totalPrice(new BigDecimal(order.get("total_price").toString()))
                        .discountApplied(new BigDecimal(order.get("discount_applied").toString()))
                        .finalPrice(new BigDecimal(order.get("final_price").toString()))
                        .paymentStatus((String) order.get("payment_status"))
                        .deliveryStatus((String) order.get("delivery_status"))
                        .cookingStatus((String) order.get("cooking_status"))
                        .dinnerName(dinnerName)
                        .styleName(styleName)
                        .build();
            }).collect(java.util.stream.Collectors.toList());
            
        } catch (Exception e) {
            log.error("Error getting user orders: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get user orders: " + e.getMessage());
        }
    }

    /**
     * 모든 주문 목록 조회 (직원용)
     */
    @SuppressWarnings("unchecked")
    public List<OrderHistoryDTO> getAllOrders() {
        try {
            List<Map<String, Object>> orders = orderRepository.getAllOrders();
            log.debug("Retrieved {} orders", orders.size());
            
            return orders.stream().map(order -> {
                Map<String, Object> orderItems = (Map<String, Object>) order.get("order_items");
                
                String dinnerName = orderItems != null ? (String) orderItems.get("dinner_name") : null;
                String styleName = orderItems != null ? (String) orderItems.get("style_name") : null;
                
                // 고객 정보 조회
                String userId = (String) order.get("user_id");
                String customerName = null;
                if (userId != null) {
                    try {
                        Map<String, Object> user = orderRepository.getUserById(userId);
                        if (user != null) {
                            customerName = (String) user.get("full_name");
                        }
                    } catch (Exception e) {
                        log.warn("Failed to fetch customer name for user {}: {}", userId, e.getMessage());
                    }
                }
                
                // LocalDateTime 변환
                LocalDateTime orderDate = null;
                LocalDateTime deliveryDate = null;
                if (order.get("order_date") != null) {
                    Object orderDateObj = order.get("order_date");
                    if (orderDateObj instanceof java.time.Instant) {
                        orderDate = ((java.time.Instant) orderDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    } else if (orderDateObj instanceof String) {
                        orderDate = java.time.Instant.parse((String) orderDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    }
                }
                if (order.get("delivery_date") != null) {
                    Object deliveryDateObj = order.get("delivery_date");
                    if (deliveryDateObj instanceof java.time.Instant) {
                        deliveryDate = ((java.time.Instant) deliveryDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    } else if (deliveryDateObj instanceof String) {
                        deliveryDate = java.time.Instant.parse((String) deliveryDateObj)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                    }
                }
                
                return OrderHistoryDTO.builder()
                        .id((String) order.get("id"))
                        .orderDate(orderDate)
                        .deliveryDate(deliveryDate)
                        .deliveryAddress((String) order.get("delivery_address"))
                        .orderItems(orderItems)
                        .totalPrice(new BigDecimal(order.get("total_price").toString()))
                        .discountApplied(new BigDecimal(order.get("discount_applied").toString()))
                        .finalPrice(new BigDecimal(order.get("final_price").toString()))
                        .paymentStatus((String) order.get("payment_status"))
                        .deliveryStatus((String) order.get("delivery_status"))
                        .cookingStatus((String) order.get("cooking_status"))
                        .dinnerName(dinnerName)
                        .styleName(styleName)
                        .userId(userId)
                        .customerName(customerName)
                        .build();
            }).collect(java.util.stream.Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting all orders: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get all orders: " + e.getMessage(), e);
        }
    }

    /**
     * 주문 ID로 주문 정보 조회
     */
    @SuppressWarnings("unchecked")
    public OrderHistoryDTO getOrderById(String orderId) {
        try {
            Map<String, Object> order = orderRepository.getOrderById(orderId);
            if (order == null) {
                throw new RuntimeException("Order not found: " + orderId);
            }

            Map<String, Object> orderItems = (Map<String, Object>) order.get("order_items");
            
            String dinnerName = orderItems != null ? (String) orderItems.get("dinner_name") : null;
            String styleName = orderItems != null ? (String) orderItems.get("style_name") : null;
            
            // LocalDateTime 변환
            LocalDateTime orderDate = null;
            LocalDateTime deliveryDate = null;
            if (order.get("order_date") != null) {
                Object orderDateObj = order.get("order_date");
                if (orderDateObj instanceof java.time.Instant) {
                    orderDate = ((java.time.Instant) orderDateObj)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime();
                } else if (orderDateObj instanceof String) {
                    orderDate = java.time.Instant.parse((String) orderDateObj)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime();
                }
            }
            if (order.get("delivery_date") != null) {
                Object deliveryDateObj = order.get("delivery_date");
                if (deliveryDateObj instanceof java.time.Instant) {
                    deliveryDate = ((java.time.Instant) deliveryDateObj)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime();
                } else if (deliveryDateObj instanceof String) {
                    deliveryDate = java.time.Instant.parse((String) deliveryDateObj)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime();
                }
            }
            
            return OrderHistoryDTO.builder()
                    .id((String) order.get("id"))
                    .orderDate(orderDate)
                    .deliveryDate(deliveryDate)
                    .deliveryAddress((String) order.get("delivery_address"))
                    .orderItems(orderItems)
                    .totalPrice(new BigDecimal(order.get("total_price").toString()))
                    .discountApplied(new BigDecimal(order.get("discount_applied").toString()))
                    .finalPrice(new BigDecimal(order.get("final_price").toString()))
                    .paymentStatus((String) order.get("payment_status"))
                    .deliveryStatus((String) order.get("delivery_status"))
                    .cookingStatus((String) order.get("cooking_status"))
                    .dinnerName(dinnerName)
                    .styleName(styleName)
                    .build();
        } catch (Exception e) {
            log.error("Error getting order by id: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get order: " + e.getMessage(), e);
        }
    }
}

