package com.softdinner.controller.voice;

import com.softdinner.dto.ErrorResponseDTO;
import com.softdinner.dto.UserResponseDTO;
import com.softdinner.dto.VoiceChatRequestDTO;
import com.softdinner.dto.VoiceChatResponseDTO;
import com.softdinner.dto.VoiceOrderDataDTO;
import com.softdinner.service.AuthService;
import com.softdinner.service.OpenAIService;
import com.softdinner.service.VoiceOrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/voice-order")
public class VoiceOrderController {

    private static final Logger logger = LoggerFactory.getLogger(VoiceOrderController.class);

    private final OpenAIService openAIService;
    private final VoiceOrderService voiceOrderService;
    private final AuthService authService;

    public VoiceOrderController(OpenAIService openAIService, VoiceOrderService voiceOrderService, AuthService authService) {
        this.openAIService = openAIService;
        this.voiceOrderService = voiceOrderService;
        this.authService = authService;
    }

    /**
     * 음성 주문 세션 시작
     */
    @PostMapping("/start")
    public ResponseEntity<?> startSession() {
        try {
            // 인증된 사용자 정보 가져오기
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userName = "고객";
            
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) auth.getPrincipal();
                String userId = userDetails.getUsername();
                
                try {
                    UserResponseDTO user = authService.getCurrentUser(userId);
                    userName = user.getFullName() != null ? user.getFullName() : "고객";
                } catch (Exception e) {
                    logger.warn("사용자 정보 조회 실패, 기본값 사용: {}", e.getMessage());
                }
            }
            
            logger.info("🎤 음성 주문 세션 시작 - 사용자: {}", userName);
            
            VoiceChatResponseDTO response = voiceOrderService.startSession(userName);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("음성 주문 세션 시작 실패", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponseDTO.builder()
                            .message("음성 주문 세션 시작에 실패했습니다: " + e.getMessage())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .build());
        }
    }

    /**
     * 음성을 텍스트로 변환 (Whisper API)
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> transcribeAudio(@RequestParam("audio") MultipartFile audioFile) {
        try {
            logger.info("🎤 음성 변환 요청 - 파일 크기: {} bytes", audioFile.getSize());
            
            String transcription = openAIService.transcribeAudio(audioFile);
            
            Map<String, String> response = new HashMap<>();
            response.put("transcription", transcription);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("음성 변환 실패", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponseDTO.builder()
                            .message("음성 인식에 실패했습니다: " + e.getMessage())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .build());
        }
    }

    /**
     * 대화 처리 (텍스트 기반)
     */
    @PostMapping("/chat")
    public ResponseEntity<?> processChat(@RequestBody VoiceChatRequestDTO request) {
        try {
            logger.info("💬 대화 처리 요청 - 세션: {}, 메시지: {}", 
                    request.getSessionId(), request.getUserMessage());
            
            // 인증된 사용자 정보 가져오기
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userName = "고객";
            
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) auth.getPrincipal();
                String userId = userDetails.getUsername();
                
                try {
                    UserResponseDTO user = authService.getCurrentUser(userId);
                    userName = user.getFullName() != null ? user.getFullName() : "고객";
                } catch (Exception e) {
                    logger.warn("사용자 정보 조회 실패, 기본값 사용: {}", e.getMessage());
                }
            }
            
            VoiceChatResponseDTO response = voiceOrderService.processConversation(
                    request.getSessionId(), 
                    request.getUserMessage(),
                    userName
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("대화 처리 실패", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponseDTO.builder()
                            .message("대화 처리에 실패했습니다: " + e.getMessage())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .build());
        }
    }

    /**
     * 주문 데이터 조회
     */
    @GetMapping("/order/{sessionId}")
    public ResponseEntity<?> getOrderData(@PathVariable String sessionId) {
        try {
            VoiceOrderDataDTO orderData = voiceOrderService.getOrderData(sessionId);
            
            if (orderData == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ErrorResponseDTO.builder()
                                .message("해당 세션의 주문 데이터를 찾을 수 없습니다")
                                .status(HttpStatus.NOT_FOUND.value())
                                .build());
            }
            
            return ResponseEntity.ok(orderData);
            
        } catch (Exception e) {
            logger.error("주문 데이터 조회 실패", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponseDTO.builder()
                            .message("주문 데이터 조회에 실패했습니다: " + e.getMessage())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .build());
        }
    }

    /**
     * 세션 종료
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<?> endSession(@PathVariable String sessionId) {
        try {
            voiceOrderService.endSession(sessionId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "세션이 종료되었습니다");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("세션 종료 실패", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponseDTO.builder()
                            .message("세션 종료에 실패했습니다: " + e.getMessage())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .build());
        }
    }
}

