package com.softdinner.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softdinner.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VoiceOrderService {

    private static final Logger logger = LoggerFactory.getLogger(VoiceOrderService.class);

    private final OpenAIService openAIService;
    private final MenuService menuService;
    private final ObjectMapper objectMapper;

    // 세션별 대화 히스토리 저장 (메모리 기반)
    private final Map<String, List<Map<String, String>>> sessionConversations = new ConcurrentHashMap<>();
    
    // 세션별 주문 데이터 저장
    private final Map<String, VoiceOrderDataDTO> sessionOrders = new ConcurrentHashMap<>();

    public VoiceOrderService(OpenAIService openAIService, MenuService menuService, ObjectMapper objectMapper) {
        this.openAIService = openAIService;
        this.menuService = menuService;
        this.objectMapper = objectMapper;
    }

    /**
     * 음성 주문 세션 시작
     */
    public VoiceChatResponseDTO startSession(String userName) {
        String sessionId = UUID.randomUUID().toString();
        
        // 시스템 프롬프트 생성
        String systemPrompt = createSystemPrompt(userName);
        
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(createMessage("system", systemPrompt));
        
        // 세션 저장
        sessionConversations.put(sessionId, messages);
        sessionOrders.put(sessionId, VoiceOrderDataDTO.builder()
                .customizations(new HashMap<>())
                .build());
        
        // 첫 인사 생성
        String greeting = String.format("안녕하세요, %s 고객님, 어떤 디너를 주문하시겠습니까?", userName);
        messages.add(createMessage("assistant", greeting));
        
        return VoiceChatResponseDTO.builder()
                .sessionId(sessionId)
                .assistantMessage(greeting)
                .isOrderComplete(false)
                .build();
    }

    /**
     * 대화 처리
     */
    public VoiceChatResponseDTO processConversation(String sessionId, String userMessage, String userName) {
        logger.info("💬 대화 처리 시작 - 세션: {}, 메시지: {}", sessionId, userMessage);
        
        // 세션 확인
        List<Map<String, String>> messages = sessionConversations.get(sessionId);
        if (messages == null) {
            // 세션이 없으면 새로 시작
            return startSession(userName);
        }
        
        // 사용자 메시지 추가
        messages.add(createMessage("user", userMessage));
        
        // GPT로 대화 처리
        String assistantResponse = openAIService.chat(messages);
        
        // 응답 저장
        messages.add(createMessage("assistant", assistantResponse));
        
        // 주문 완료 여부 확인 (주문 데이터 추출 시도)
        VoiceOrderDataDTO orderData = extractOrderData(messages, sessionId);
        boolean isComplete = checkIfOrderComplete(assistantResponse, orderData);
        
        if (isComplete) {
            // 주문 완료 시 세션 정리
            logger.info("✅ 주문 완료 - 세션: {}", sessionId);
            sessionOrders.put(sessionId, orderData);
        }
        
        return VoiceChatResponseDTO.builder()
                .sessionId(sessionId)
                .assistantMessage(assistantResponse)
                .isOrderComplete(isComplete)
                .orderData(isComplete ? orderData : null)
                .build();
    }

    /**
     * 주문 데이터 가져오기
     */
    public VoiceOrderDataDTO getOrderData(String sessionId) {
        return sessionOrders.get(sessionId);
    }

    /**
     * 세션 종료
     */
    public void endSession(String sessionId) {
        sessionConversations.remove(sessionId);
        sessionOrders.remove(sessionId);
        logger.info("🗑️ 세션 종료: {}", sessionId);
    }

    // ========== Private Methods ==========

    private Map<String, String> createMessage(String role, String content) {
        Map<String, String> message = new HashMap<>();
        message.put("role", role);
        message.put("content", content);
        return message;
    }

    private String createSystemPrompt(String userName) {
        // 메뉴 정보 가져오기
        List<DinnerDTO> dinners = menuService.findAllDinners();
        List<StyleDTO> styles = menuService.findAllStyles();
        Map<String, List<MenuItemDTO>> dinnerMenuItems = new HashMap<>();
        for (DinnerDTO dinner : dinners) {
            dinnerMenuItems.put(dinner.getId(), menuService.findMenuItemsByDinnerId(dinner.getId()));
        }
        
        StringBuilder prompt = new StringBuilder();
        prompt.append("당신은 고급 디너 배달 서비스 'SoftDinner'의 AI 주문 도우미입니다.\n\n");
        prompt.append("**역할:**\n");
        prompt.append("- 고객과 자연스럽게 대화하며 디너 주문을 도와줍니다.\n");
        prompt.append("- 고객의 기념일이나 취향을 파악하여 적합한 디너를 추천합니다.\n");
        prompt.append("- 주문이 완료되면 반드시 다음 형식으로 응답에 포함해주세요:\n");
        prompt.append("  [ORDER_COMPLETE]\n");
        prompt.append("  {\n");
        prompt.append("    \"dinnerName\": \"디너명\",\n");
        prompt.append("    \"styleName\": \"스타일명\",\n");
        prompt.append("    \"deliveryDate\": \"YYYY-MM-DD\",\n");
        prompt.append("    \"customizations\": {\"메뉴아이템명\": 수량}\n");
        prompt.append("  }\n");
        prompt.append("  [/ORDER_COMPLETE]\n\n");
        
        prompt.append("**대화 시나리오:**\n");
        prompt.append("1. 인사 및 주문 의도 확인\n");
        prompt.append("2. 기념일이나 용도 질문 (예: 무슨 기념일인가요?)\n");
        prompt.append("3. 디너 추천 (2개 정도)\n");
        prompt.append("4. 고객이 선택하면 스타일 추천\n");
        prompt.append("5. 커스터마이징 의사 확인 (바케트빵, 와인/샴페인 수량 변경)\n");
        prompt.append("6. 주문 내역 확인\n");
        prompt.append("7. 배달 날짜 확정 (내일, 모레 등 자연어 날짜 파싱)\n");
        prompt.append("8. 주문 완료 및 [ORDER_COMPLETE] 태그로 데이터 반환\n\n");
        
        prompt.append("**고객 정보:**\n");
        prompt.append("- 고객명: ").append(userName).append("\n\n");
        
        prompt.append("**이용 가능한 디너 메뉴:**\n");
        for (DinnerDTO dinner : dinners) {
            prompt.append("- ").append(dinner.getName())
                    .append(" (가격: ₩").append(String.format("%,.0f", dinner.getBasePrice())).append(")\n");
            
            // DB description 대신 실제 메뉴 아이템 기반 설명 생성
            String accurateDescription = generateAccurateDescription(dinner);
            prompt.append("  설명: ").append(accurateDescription).append("\n");
            
            // 기본 구성 메뉴 아이템 표시
            List<MenuItemDTO> menuItems = dinnerMenuItems.getOrDefault(dinner.getId(), Collections.emptyList());
            if (!menuItems.isEmpty()) {
                prompt.append("  기본 구성: ");
                for (int i = 0; i < menuItems.size(); i++) {
                    MenuItemDTO item = menuItems.get(i);
                    if (i > 0) prompt.append(", ");
                    prompt.append(item.getName());
                    if (item.getDefaultQuantity() > 0) {
                        prompt.append(" ").append(item.getDefaultQuantity()).append(item.getUnit());
                    } else {
                        prompt.append(" (선택 옵션)");
                    }
                }
                prompt.append("\n");
            }
        }
        prompt.append("\n");
        
        prompt.append("**이용 가능한 서빙 스타일:**\n");
        for (StyleDTO style : styles) {
            prompt.append("- ").append(style.getName())
                    .append(" (추가 가격: ₩").append(String.format("%,.0f", style.getPriceModifier())).append(")\n");
            if (style.getDetails() != null) {
                prompt.append("  상세: ").append(style.getDetails()).append("\n");
            }
        }
        prompt.append("\n");

        prompt.append("**디너별 커스터마이징 가능 항목:**\n");
        for (DinnerDTO dinner : dinners) {
            prompt.append("- ").append(dinner.getName()).append(":\n");
            List<MenuItemDTO> menuItems = dinnerMenuItems.getOrDefault(dinner.getId(), Collections.emptyList());
            if (menuItems.isEmpty()) {
                prompt.append("  • 등록된 커스터마이징 항목 없음\n");
            } else {
                for (MenuItemDTO item : menuItems) {
                    prompt.append("  • ").append(describeMenuItem(item)).append("\n");
                }
            }
            prompt.append("  • 위 항목 외 옵션은 이 디너에서 제공되지 않으므로 절대 추가하지 말고, 고객에게 불가하다고 안내하세요.\n");
        }
        prompt.append("\n");
        
        prompt.append("**엄격한 메뉴 일치 규칙:**\n");
        prompt.append("1. customizations JSON에는 반드시 선택된 디너의 메뉴 아이템만 포함해야 합니다.\n");
        prompt.append("2. 다른 디너 전용 항목(예: French Dinner에서 샴페인)을 요청받으면, 해당 디너에서는 제공되지 않는다고 안내하고 필요한 경우 해당 항목을 제공하는 디너로 변경해야 한다고 설명하세요.\n");
        prompt.append("3. 없는 항목을 임의로 추가하거나 가격을 추정하지 말고, 실제 옵션만 제시하세요.\n\n");
        
        prompt.append("**중요: 커스터마이징 및 가격 계산 규칙:**\n");
        prompt.append("1. 각 디너는 위에 표시된 '기본 구성'을 포함하고 있으며, 기본 가격에 이미 반영되어 있습니다.\n");
        prompt.append("2. 기본 수량이 0개인 항목은 선택 옵션이며, 기본 가격에 포함되지 않습니다.\n");
        prompt.append("3. 커스터마이징 시:\n");
        prompt.append("   - 기본 구성 품목의 수량을 기본값 그대로 유지하면 추가 요금이 없습니다.\n");
        prompt.append("   - 기본 수량보다 증가시키면 증가분만큼 추가 요금이 발생합니다.\n");
        prompt.append("   - 기본 수량보다 감소시키면 감소분만큼 할인됩니다.\n");
        prompt.append("   - 선택 옵션(기본 0개)을 추가하면 추가한 수량만큼 요금이 발생합니다.\n");
        prompt.append("4. **중요: customizations에는 모든 메뉴 아이템의 최종 수량을 기록합니다.**\n");
        prompt.append("   - 예: French Dinner의 경우 기본이 '스테이크 1개, 샐러드 1개, 커피 1잔, 와인 1잔'인데,\n");
        prompt.append("     고객이 커피를 2잔으로 늘리고 와인을 0잔으로 줄이면:\n");
        prompt.append("     {\"스테이크\": 1, \"샐러드\": 1, \"커피\": 2, \"와인\": 0}\n");
        prompt.append("   - 기본값 그대로여도 모든 항목을 포함해야 합니다.\n");
        prompt.append("5. **주문 완료 조건:**\n");
        prompt.append("   - 모든 정보(디너, 스타일, 배달 날짜, 커스터마이징)가 확정되면 바로 [ORDER_COMPLETE] 태그를 사용하세요.\n");
        prompt.append("   - 고객에게 확인을 받을 필요 없이, 모든 정보가 충족되면 즉시 [ORDER_COMPLETE] 태그를 포함하세요.\n");
        prompt.append("   - [ORDER_COMPLETE] 태그는 응답에 포함되지만, 고객에게는 보이지 않습니다.\n\n");
        
        prompt.append("**배달 날짜 규칙:**\n");
        prompt.append("- 배달 날짜는 오늘 이후 날짜로 지정해야 합니다.\n");
        prompt.append("- 고객이 '내일'이라고 하면 오늘 날짜 기준으로 계산하세요.\n");
        prompt.append("- 고객이 '모레'라고 하면 오늘로부터 2일 후로 계산하세요.\n");
        prompt.append("- 오늘 날짜: ").append(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))).append("\n\n");
        
        prompt.append("항상 친절하고 자연스러운 대화를 유지하세요.");
        
        return prompt.toString();
    }

    private VoiceOrderDataDTO extractOrderData(List<Map<String, String>> messages, String sessionId) {
        // 마지막 assistant 메시지에서 주문 데이터 추출
        for (int i = messages.size() - 1; i >= 0; i--) {
            Map<String, String> msg = messages.get(i);
            if ("assistant".equals(msg.get("role"))) {
                String content = msg.get("content");
                logger.info("🔍 메시지 내용 확인: {}", content);
                
                if (content.contains("[ORDER_COMPLETE]")) {
                    logger.info("✅ [ORDER_COMPLETE] 태그 발견!");
                    try {
                        int startIdx = content.indexOf("[ORDER_COMPLETE]") + "[ORDER_COMPLETE]".length();
                        int endIdx = content.indexOf("[/ORDER_COMPLETE]");
                        if (endIdx > startIdx) {
                            String jsonStr = content.substring(startIdx, endIdx).trim();
                            logger.info("📝 추출된 JSON: {}", jsonStr);
                            
                            JsonNode jsonNode = objectMapper.readTree(jsonStr);
                            VoiceOrderDataDTO orderData = parseOrderDataFromJson(jsonNode);
                            
                            logger.info("📦 파싱된 주문 데이터: dinnerId={}, styleId={}, deliveryDate={}", 
                                    orderData.getDinnerId(), orderData.getStyleId(), orderData.getDeliveryDate());
                            
                            return orderData;
                        } else {
                            logger.error("❌ [/ORDER_COMPLETE] 종료 태그가 없거나 위치가 잘못됨");
                        }
                    } catch (JsonProcessingException e) {
                        logger.error("❌ 주문 데이터 파싱 실패", e);
                    }
                } else {
                    logger.debug("⚠️ [ORDER_COMPLETE] 태그 없음");
                }
                break;
            }
        }
        return null;
    }

    private VoiceOrderDataDTO parseOrderDataFromJson(JsonNode json) {
        String dinnerName = json.has("dinnerName") ? json.get("dinnerName").asText() : null;
        String styleName = json.has("styleName") ? json.get("styleName").asText() : null;
        String deliveryDate = json.has("deliveryDate") ? json.get("deliveryDate").asText() : null;
        
        logger.info("🔍 JSON에서 추출: dinnerName={}, styleName={}, deliveryDate={}", 
                dinnerName, styleName, deliveryDate);
        
        // 한글 → 영어 디너 이름 매핑
        dinnerName = mapKoreanToEnglishDinner(dinnerName);
        logger.info("🔄 매핑 후 디너명: {}", dinnerName);
        
        // 디너 ID 찾기 (대소문자 무시, 부분 매칭 포함)
        String dinnerId = null;
        if (dinnerName != null) {
            List<DinnerDTO> dinners = menuService.findAllDinners();
            logger.info("📋 사용 가능한 디너 목록:");
            for (DinnerDTO dinner : dinners) {
                logger.info("  - {}", dinner.getName());
                // 정확한 매칭 (대소문자 무시)
                if (dinner.getName().equalsIgnoreCase(dinnerName.trim())) {
                    dinnerId = dinner.getId();
                    logger.info("✅ 디너 매칭 성공: {} -> {}", dinnerName, dinnerId);
                    break;
                }
                // 부분 매칭 (공백 제거 후)
                if (dinnerId == null && dinner.getName().replace(" ", "")
                        .equalsIgnoreCase(dinnerName.replace(" ", "").trim())) {
                    dinnerId = dinner.getId();
                    logger.info("✅ 디너 부분 매칭 성공: {} -> {}", dinnerName, dinnerId);
                    break;
                }
            }
            if (dinnerId == null) {
                logger.error("❌ 디너 매칭 실패: {}", dinnerName);
            }
        }
        
        // 한글 → 영어 스타일 이름 매핑
        styleName = mapKoreanToEnglishStyle(styleName);
        logger.info("🔄 매핑 후 스타일명: {}", styleName);
        
        // 스타일 ID 찾기 (대소문자 무시, 부분 매칭 포함)
        String styleId = null;
        if (styleName != null) {
            List<StyleDTO> styles = menuService.findAllStyles();
            logger.info("📋 사용 가능한 스타일 목록:");
            for (StyleDTO style : styles) {
                logger.info("  - {}", style.getName());
                // 정확한 매칭 (대소문자 무시)
                if (style.getName().equalsIgnoreCase(styleName.trim())) {
                    styleId = style.getId();
                    logger.info("✅ 스타일 매칭 성공: {} -> {}", styleName, styleId);
                    break;
                }
                // 부분 매칭 (공백 제거 후)
                if (styleId == null && style.getName().replace(" ", "")
                        .equalsIgnoreCase(styleName.replace(" ", "").trim())) {
                    styleId = style.getId();
                    logger.info("✅ 스타일 부분 매칭 성공: {} -> {}", styleName, styleId);
                    break;
                }
                // "디럭스" vs "Deluxe" 등의 매칭
                if (styleId == null && style.getName().toLowerCase().contains(styleName.toLowerCase().trim())) {
                    styleId = style.getId();
                    logger.info("✅ 스타일 포함 매칭 성공: {} -> {}", styleName, styleId);
                    break;
                }
            }
            if (styleId == null) {
                logger.error("❌ 스타일 매칭 실패: {}", styleName);
            }
        }
        
        // 커스터마이징 파싱
        Map<String, Integer> customizations = new HashMap<>();
        if (json.has("customizations") && json.get("customizations").isObject()) {
            JsonNode customNode = json.get("customizations");
            
            // 메뉴 아이템 가져오기
            if (dinnerId != null) {
                List<MenuItemDTO> menuItems = menuService.findMenuItemsByDinnerId(dinnerId);
                
                customNode.fields().forEachRemaining(entry -> {
                    String itemName = entry.getKey();
                    int quantity = entry.getValue().asInt();
                    
                    // 메뉴 아이템 ID 찾기
                    for (MenuItemDTO item : menuItems) {
                        if (item.getName().equals(itemName)) {
                            customizations.put(item.getId(), quantity);
                            break;
                        }
                    }
                });
            }
        }
        
        return VoiceOrderDataDTO.builder()
                .dinnerId(dinnerId)
                .dinnerName(dinnerName)
                .styleId(styleId)
                .styleName(styleName)
                .deliveryDate(deliveryDate)
                .customizations(customizations)
                .build();
    }

    /**
     * 실제 메뉴 아이템 기반으로 정확한 디너 설명 생성
     */
    private String generateAccurateDescription(DinnerDTO dinner) {
        List<MenuItemDTO> menuItems = menuService.findMenuItemsByDinnerId(dinner.getId());
        
        // 디너별 커스텀 설명
        switch (dinner.getName()) {
            case "Valentine Dinner":
                return "작은 하트 모양과 큐피드가 장식된 접시에 냅킨과 함께 와인과 스테이크가 제공됩니다.";
            
            case "French Dinner":
                return "커피 한잔, 와인 한잔, 샐러드, 스테이크가 제공됩니다.";
            
            case "English Dinner":
                return "에그 스크램블, 베이컨, 빵, 스테이크가 제공됩니다.";
            
            case "Champagne Feast":
                return "항상 2인 식사이고, 샴페인 1병, 바게트빵 4개, 커피 1포트, 와인, 스테이크가 제공됩니다.";
            
            default:
                // 기본값: 실제 메뉴 아이템 나열
                StringBuilder desc = new StringBuilder();
                for (int i = 0; i < menuItems.size(); i++) {
                    MenuItemDTO item = menuItems.get(i);
                    if (i > 0) desc.append(", ");
                    desc.append(item.getName());
                    if (item.getDefaultQuantity() > 0) {
                        desc.append(" ").append(item.getDefaultQuantity()).append(item.getUnit());
                    }
                }
                desc.append("가 제공됩니다.");
                return desc.toString();
        }
    }
    
    /**
     * 한글 디너명을 영어로 매핑
     */
    private String mapKoreanToEnglishDinner(String koreanName) {
        if (koreanName == null) return null;
        
        String normalized = koreanName.trim();
        
        // 한글 → 영어 매핑
        Map<String, String> mapping = new HashMap<>();
        mapping.put("발렌타인 디너", "Valentine Dinner");
        mapping.put("발렌타인디너", "Valentine Dinner");
        mapping.put("프렌치 디너", "French Dinner");
        mapping.put("프렌치디너", "French Dinner");
        mapping.put("잉글리시 디너", "English Dinner");
        mapping.put("잉글리시디너", "English Dinner");
        mapping.put("영국 디너", "English Dinner");
        mapping.put("영국디너", "English Dinner");
        mapping.put("샴페인 축제 디너", "Champagne Feast");
        mapping.put("샴페인축제디너", "Champagne Feast");
        mapping.put("샴페인 디너", "Champagne Feast");
        mapping.put("샴페인디너", "Champagne Feast");
        
        return mapping.getOrDefault(normalized, normalized);
    }
    
    /**
     * 한글 스타일명을 영어로 매핑
     */
    private String mapKoreanToEnglishStyle(String koreanName) {
        if (koreanName == null) return null;
        
        String normalized = koreanName.trim();
        
        // 한글 → 영어 매핑
        Map<String, String> mapping = new HashMap<>();
        mapping.put("심플 스타일", "simple");
        mapping.put("심플스타일", "simple");
        mapping.put("심플", "simple");
        mapping.put("그랜드 스타일", "grand");
        mapping.put("그랜드스타일", "grand");
        mapping.put("그랜드", "grand");
        mapping.put("디럭스 스타일", "deluxe");
        mapping.put("디럭스스타일", "deluxe");
        mapping.put("디럭스", "deluxe");
        
        return mapping.getOrDefault(normalized, normalized);
    }

    private String describeMenuItem(MenuItemDTO item) {
        String unit = item.getUnit() != null ? item.getUnit() : "";
        String unitLabel = unit.isEmpty() ? "" : unit;
        StringBuilder description = new StringBuilder();
        description.append(item.getName());

        if (item.getDefaultQuantity() != null) {
            description.append(" - 기본 ").append(item.getDefaultQuantity()).append(unitLabel);
        }

        if (Boolean.TRUE.equals(item.getIsRequired())) {
            description.append(", 필수");
        } else {
            description.append(", 선택");
        }

        if (Boolean.FALSE.equals(item.getCanRemove())) {
            description.append(", 제거 불가");
        } else if (Boolean.TRUE.equals(item.getCanRemove())) {
            description.append(", 제거 가능");
        }

        if (Boolean.TRUE.equals(item.getCanIncrease()) || Boolean.TRUE.equals(item.getCanDecrease())) {
            description.append(", 증감: ");
            if (Boolean.TRUE.equals(item.getCanIncrease())) {
                description.append("증가 가능");
            }
            if (Boolean.TRUE.equals(item.getCanIncrease()) && Boolean.TRUE.equals(item.getCanDecrease())) {
                description.append("/");
            }
            if (Boolean.TRUE.equals(item.getCanDecrease())) {
                description.append("감소 가능");
            }
        }

        if (item.getMinQuantity() != null || item.getMaxQuantity() != null) {
            description.append(" (");
            if (item.getMinQuantity() != null) {
                description.append("최소 ").append(item.getMinQuantity()).append(unitLabel);
            }
            if (item.getMinQuantity() != null && item.getMaxQuantity() != null) {
                description.append(", ");
            }
            if (item.getMaxQuantity() != null) {
                description.append("최대 ").append(item.getMaxQuantity()).append(unitLabel);
            }
            description.append(")");
        }

        Double pricePerUnit = item.getAdditionalPrice() != null && item.getAdditionalPrice() > 0
                ? item.getAdditionalPrice()
                : item.getBasePrice();
        if (pricePerUnit != null && pricePerUnit > 0) {
            description.append(", 추가 ")
                    .append(unitLabel.isEmpty() ? "" : unitLabel)
                    .append("당 ₩").append(formatCurrency(pricePerUnit));
        }

        return description.toString();
    }

    private String formatCurrency(Double value) {
        if (value == null) {
            return "0";
        }
        return String.format("%,.0f", value);
    }

    private boolean checkIfOrderComplete(String response, VoiceOrderDataDTO orderData) {
        boolean hasTag = response.contains("[ORDER_COMPLETE]");
        boolean hasData = orderData != null;
        boolean hasDinner = orderData != null && orderData.getDinnerId() != null;
        boolean hasStyle = orderData != null && orderData.getStyleId() != null;
        boolean hasDate = orderData != null && orderData.getDeliveryDate() != null;
        
        logger.info("🔍 주문 완료 체크: hasTag={}, hasData={}, hasDinner={}, hasStyle={}, hasDate={}", 
                hasTag, hasData, hasDinner, hasStyle, hasDate);
        
        boolean isComplete = hasTag && hasData && hasDinner && hasStyle && hasDate;
        
        if (hasTag && !isComplete) {
            logger.error("⚠️ [ORDER_COMPLETE] 태그는 있지만 필수 데이터가 부족합니다!");
            if (!hasDinner) logger.error("  - dinnerId 누락");
            if (!hasStyle) logger.error("  - styleId 누락");
            if (!hasDate) logger.error("  - deliveryDate 누락");
        }
        
        return isComplete;
    }
}

