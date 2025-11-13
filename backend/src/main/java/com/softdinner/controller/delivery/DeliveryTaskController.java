package com.softdinner.controller.delivery;

import com.softdinner.repository.OrderRepository;
import com.softdinner.service.DeliveryTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/delivery-tasks")
public class DeliveryTaskController {

    private final DeliveryTaskService deliveryTaskService;
    private final OrderRepository orderRepository;

    public DeliveryTaskController(DeliveryTaskService deliveryTaskService, OrderRepository orderRepository) {
        this.deliveryTaskService = deliveryTaskService;
        this.orderRepository = orderRepository;
    }

    /**
     * Staff의 배달 작업 목록 조회
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getDeliveryTasks(Authentication authentication) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            List<Map<String, Object>> tasks = deliveryTaskService.getDeliveryTasksByStaff(staffId);
            
            return ResponseEntity.ok(Map.of("tasks", tasks));
        } catch (Exception e) {
            log.error("Error getting delivery tasks: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to get delivery tasks: " + e.getMessage()));
        }
    }

    /**
     * 배달 시작
     */
    @PostMapping("/{taskId}/start")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> startDelivery(
            @PathVariable String taskId,
            Authentication authentication
    ) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            Map<String, Object> task = deliveryTaskService.startDelivery(taskId, staffId);
            
            return ResponseEntity.ok(Map.of("task", task, "message", "배달이 시작되었습니다"));
        } catch (RuntimeException e) {
            log.error("Error starting delivery: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error starting delivery: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to start delivery: " + e.getMessage()));
        }
    }

    /**
     * 배달 완료
     */
    @PostMapping("/{taskId}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> completeDelivery(
            @PathVariable String taskId,
            Authentication authentication
    ) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            Map<String, Object> task = deliveryTaskService.completeDelivery(taskId, staffId);
            
            return ResponseEntity.ok(Map.of("task", task, "message", "배달이 완료되었습니다"));
        } catch (RuntimeException e) {
            log.error("Error completing delivery: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error completing delivery: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to complete delivery: " + e.getMessage()));
        }
    }

    /**
     * Staff 역할 확인
     */
    private boolean isStaff(Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = userDetails.getUsername();
            Map<String, Object> user = orderRepository.getUserById(userId);
            if (user != null) {
                String role = (String) user.get("role");
                return "staff".equalsIgnoreCase(role);
            }
            return false;
        } catch (Exception e) {
            log.error("Error checking staff role: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 현재 사용자 ID 가져오기
     */
    private String getUserId(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return userDetails.getUsername();
    }
}

