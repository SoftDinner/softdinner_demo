package com.softdinner.controller.menu;

import com.softdinner.dto.*;
import com.softdinner.service.MenuService;
import lombok.*;
import lombok.extern.slf4j.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    public ResponseEntity<List<DinnerDTO>> getAllDinners() {
        try {
            List<DinnerDTO> dinners = menuService.findAllDinners();
            return ResponseEntity.ok(dinners);
        } catch (Exception e) {
            log.error("Error fetching all dinners: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{dinnerId}")
    public ResponseEntity<DinnerDTO> getDinnerById(@PathVariable String dinnerId) {
        try {
            DinnerDTO dinner = menuService.findDinnerById(dinnerId);
            
            if (dinner == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(dinner);
        } catch (Exception e) {
            log.error("Error fetching dinner by id: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{dinnerId}/items")
    public ResponseEntity<List<MenuItemDTO>> getMenuItemsByDinnerId(@PathVariable String dinnerId) {
        try {
            List<MenuItemDTO> items = menuService.findMenuItemsByDinnerId(dinnerId);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error fetching menu items: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/styles")
    public ResponseEntity<List<StyleDTO>> getAllStyles() {
        try {
            List<StyleDTO> styles = menuService.findAllStyles();
            return ResponseEntity.ok(styles);
        } catch (Exception e) {
            log.error("Error fetching styles: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

