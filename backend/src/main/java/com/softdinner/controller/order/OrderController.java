package com.softdinner.controller.order;

import com.softdinner.dto.*;
import com.softdinner.service.OrderService;
import jakarta.validation.Valid;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponseDTO> createOrder(
            @Valid @RequestBody CreateOrderRequestDTO request,
            Authentication authentication
    ) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();

            OrderResponseDTO response = orderService.createOrder(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error creating order: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(OrderResponseDTO.builder()
                            .message("주문 생성에 실패했습니다: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderHistoryDTO>> getUserOrders(Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();
            
            log.debug("Getting orders for user: {}", userId);

            List<OrderHistoryDTO> orders = orderService.getUserOrders(userId);
            log.debug("Returning {} orders", orders.size());
            
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Error getting user orders: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<List<OrderHistoryDTO>> getAllOrders(Authentication authentication) {
        try {
            log.debug("Getting all orders for staff");

            List<OrderHistoryDTO> orders = orderService.getAllOrders();
            log.debug("Returning {} orders", orders.size());
            
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Error getting all orders: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderHistoryDTO> getOrderById(@PathVariable String orderId, Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();

            OrderHistoryDTO order = orderService.getOrderById(orderId);
            
            // 주문이 해당 사용자의 것인지 확인 (직원은 모든 주문 조회 가능)
            // TODO: 직원 권한 체크 추가 필요
            if (order.getUserId() != null && !order.getUserId().equals(userId)) {
                // 직원이 아닌 경우 자신의 주문만 조회 가능
                // 이 부분은 SecurityConfig에서 처리하거나 여기서 체크
            }
            
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Error getting order by id: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }
}

