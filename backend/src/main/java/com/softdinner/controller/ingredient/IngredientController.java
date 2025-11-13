package com.softdinner.controller.ingredient;

import com.softdinner.dto.*;
import com.softdinner.service.IngredientService;
import com.softdinner.repository.OrderRepository;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;
    private final OrderRepository orderRepository;

    public IngredientController(IngredientService ingredientService, OrderRepository orderRepository) {
        this.ingredientService = ingredientService;
        this.orderRepository = orderRepository;
    }

    /**
     * 사용자가 staff 역할인지 확인
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
     * 모든 재료 목록 조회
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<IngredientDTO>> getAllIngredients(Authentication authentication) {
        // 역할 확인은 컨트롤러에서 수동으로 처리
        if (!isStaff(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<IngredientDTO> ingredients = ingredientService.getAllIngredients();
            return ResponseEntity.ok(ingredients);
        } catch (Exception e) {
            log.error("Error getting ingredients: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }

    /**
     * 재료 입고 처리
     */
    @PostMapping("/stock")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<IngredientDTO> addStock(
            @Valid @RequestBody AddStockRequestDTO request,
            Authentication authentication
    ) {
        // 역할 확인
        if (!isStaff(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String staffId = userDetails.getUsername();

            IngredientDTO updatedIngredient = ingredientService.addStock(request, staffId);
            return ResponseEntity.ok(updatedIngredient);
        } catch (Exception e) {
            log.error("Error adding stock: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }

    /**
     * 입출고 기록 조회
     */
    @GetMapping("/logs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<IngredientLogDTO>> getIngredientLogs(
            Authentication authentication,
            @RequestParam(required = false) String ingredientId,
            @RequestParam(required = false, defaultValue = "50") Integer limit
    ) {
        // 역할 확인
        if (!isStaff(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        try {
            List<IngredientLogDTO> logs = ingredientService.getIngredientLogs(ingredientId, limit);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Error getting ingredient logs: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        }
    }
}

