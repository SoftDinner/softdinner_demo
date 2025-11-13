package com.softdinner.controller.cooking;

import com.softdinner.repository.OrderRepository;
import com.softdinner.service.CookingTaskService;
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
@RequestMapping("/api/cooking-tasks")
public class CookingTaskController {

    private final CookingTaskService cookingTaskService;
    private final OrderRepository orderRepository;

    public CookingTaskController(CookingTaskService cookingTaskService, OrderRepository orderRepository) {
        this.cookingTaskService = cookingTaskService;
        this.orderRepository = orderRepository;
    }

    /**
     * Staff의 요리 작업 목록 조회
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCookingTasks(Authentication authentication) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            List<Map<String, Object>> tasks = cookingTaskService.getCookingTasksByStaff(staffId);
            
            return ResponseEntity.ok(Map.of("tasks", tasks));
        } catch (Exception e) {
            log.error("Error getting cooking tasks: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to get cooking tasks: " + e.getMessage()));
        }
    }

    /**
     * 요리 시작
     */
    @PostMapping("/{taskId}/start")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> startCooking(
            @PathVariable String taskId,
            Authentication authentication
    ) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            Map<String, Object> task = cookingTaskService.startCooking(taskId, staffId);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> deductionResult = (Map<String, Object>) task.get("deductionResult");
            
            return ResponseEntity.ok(Map.of(
                "task", task,
                "message", "요리가 시작되었습니다. 재료가 자동으로 차감되었습니다.",
                "deductionResult", deductionResult != null ? deductionResult : Map.of()
            ));
        } catch (RuntimeException e) {
            log.error("Error starting cooking: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error starting cooking: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to start cooking: " + e.getMessage()));
        }
    }

    /**
     * 요리 완료 (재료 자동 차감 포함)
     */
    @PostMapping("/{taskId}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> completeCooking(
            @PathVariable String taskId,
            Authentication authentication
    ) {
        try {
            if (!isStaff(authentication)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden: Staff only"));
            }

            String staffId = getUserId(authentication);
            Map<String, Object> task = cookingTaskService.completeCooking(taskId, staffId);
            
            return ResponseEntity.ok(Map.of(
                "task", task,
                "message", "요리가 완료되었습니다."
            ));
        } catch (RuntimeException e) {
            log.error("Error completing cooking: {}", e.getMessage(), e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error completing cooking: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to complete cooking: " + e.getMessage()));
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

