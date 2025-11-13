package com.softdinner.service;

import com.softdinner.dto.*;
import com.softdinner.repository.MenuRepository;
import lombok.extern.slf4j.*;
import org.springframework.stereotype.*;

import java.util.*;
import java.util.stream.*;

@Slf4j
@Service
public class MenuService {

    private final MenuRepository menuRepository;

    public MenuService(MenuRepository menuRepository) {
        this.menuRepository = menuRepository;
    }

    public List<DinnerDTO> findAllDinners() {
        List<Map<String, Object>> dinners = menuRepository.findAllDinners();
        
        return dinners.stream()
                .map(this::mapToDinnerDTO)
                .collect(Collectors.toList());
    }

    public DinnerDTO findDinnerById(String dinnerId) {
        Map<String, Object> dinner = menuRepository.findDinnerById(dinnerId);
        
        if (dinner == null) {
            return null;
        }
        
        return mapToDinnerDTO(dinner);
    }

    public List<MenuItemDTO> findMenuItemsByDinnerId(String dinnerId) {
        List<Map<String, Object>> items = menuRepository.findMenuItemsByDinnerId(dinnerId);
        
        if (items == null || items.isEmpty()) {
            return new ArrayList<>();
        }
        
        // 중복 제거: 이름 기준으로 중복 제거 (같은 이름의 메뉴는 하나만 유지)
        // 먼저 ID 기준으로 중복 제거, 그 다음 이름 기준으로 중복 제거
        Map<String, MenuItemDTO> uniqueById = new LinkedHashMap<>();
        Set<String> seenIds = new HashSet<>();
        
        // 1단계: ID 기준 중복 제거
        for (Map<String, Object> item : items) {
            if (item == null) continue;
            
            String itemId = (String) item.get("id");
            if (itemId != null && !itemId.isEmpty() && !seenIds.contains(itemId)) {
                seenIds.add(itemId);
                uniqueById.put(itemId, mapToMenuItemDTO(item));
            }
        }
        
        // 2단계: 이름 기준 중복 제거 (같은 이름이면 첫 번째 것만 유지)
        Map<String, MenuItemDTO> uniqueByName = new LinkedHashMap<>();
        Set<String> seenNames = new HashSet<>();
        
        for (MenuItemDTO item : uniqueById.values()) {
            String itemName = item.getName();
            if (itemName != null && !itemName.isEmpty() && !seenNames.contains(itemName)) {
                seenNames.add(itemName);
                uniqueByName.put(item.getId(), item);
            } else if (itemName != null && seenNames.contains(itemName)) {
                log.warn("중복된 메뉴 항목 이름 발견 (제거됨): dinner_id={}, name={}, id={}", 
                        dinnerId, itemName, item.getId());
            }
        }
        
        log.debug("Menu items for dinner {}: total={}, unique_by_id={}, unique_by_name={}", 
                dinnerId, items.size(), uniqueById.size(), uniqueByName.size());
        
        return new ArrayList<>(uniqueByName.values());
    }

    public List<StyleDTO> findAllStyles() {
        List<Map<String, Object>> styles = menuRepository.findAllStyles();
        
        return styles.stream()
                .map(this::mapToStyleDTO)
                .collect(Collectors.toList());
    }

    private DinnerDTO mapToDinnerDTO(Map<String, Object> data) {
        @SuppressWarnings("unchecked")
        List<String> availableStyles = data.get("available_styles") != null 
                ? (List<String>) data.get("available_styles") 
                : new ArrayList<>();

        return DinnerDTO.builder()
                .id((String) data.get("id"))
                .name((String) data.get("name"))
                .basePrice(((Number) data.get("base_price")).doubleValue())
                .description((String) data.get("description"))
                .availableStyles(availableStyles)
                .imageUrl((String) data.get("image_url"))
                .isAvailable((Boolean) data.get("is_available"))
                .build();
    }

    private MenuItemDTO mapToMenuItemDTO(Map<String, Object> data) {
        return MenuItemDTO.builder()
                .id((String) data.get("id"))
                .dinnerId((String) data.get("dinner_id"))
                .name((String) data.get("name"))
                .defaultQuantity((Integer) data.get("default_quantity"))
                .unit((String) data.get("unit"))
                .basePrice(data.get("base_price") != null 
                        ? ((Number) data.get("base_price")).doubleValue() 
                        : null)
                .additionalPrice(data.get("additional_price") != null 
                        ? ((Number) data.get("additional_price")).doubleValue() 
                        : null)
                .isRequired((Boolean) data.get("is_required"))
                .canRemove((Boolean) data.get("can_remove"))
                .canIncrease((Boolean) data.get("can_increase"))
                .canDecrease((Boolean) data.get("can_decrease"))
                .maxQuantity((Integer) data.get("max_quantity"))
                .minQuantity((Integer) data.get("min_quantity"))
                .ingredientId((String) data.get("ingredient_id"))
                .ingredientQuantityPerUnit(data.get("ingredient_quantity_per_unit") != null 
                        ? ((Number) data.get("ingredient_quantity_per_unit")).doubleValue() 
                        : null)
                .build();
    }

    private StyleDTO mapToStyleDTO(Map<String, Object> data) {
        return StyleDTO.builder()
                .id((String) data.get("id"))
                .name((String) data.get("name"))
                .priceModifier(((Number) data.get("price_modifier")).doubleValue())
                .details((String) data.get("details"))
                .build();
    }
}

