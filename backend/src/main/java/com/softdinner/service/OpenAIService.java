package com.softdinner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenAIService {

    private static final Logger logger = LoggerFactory.getLogger(OpenAIService.class);

    private final WebClient openAIWebClient;  // Whisper API용
    private final WebClient openRouterWebClient;  // GPT용
    private final ObjectMapper objectMapper;

    public OpenAIService(
            @Qualifier("openAIWebClient") WebClient openAIWebClient,
            @Qualifier("openRouterWebClient") WebClient openRouterWebClient,
            ObjectMapper objectMapper) {
        this.openAIWebClient = openAIWebClient;
        this.openRouterWebClient = openRouterWebClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Whisper API를 사용하여 음성을 텍스트로 변환
     */
    public String transcribeAudio(MultipartFile audioFile) throws IOException {
        logger.info("🎤 Whisper API 호출 시작 - 파일 크기: {} bytes", audioFile.getSize());

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(audioFile.getBytes()) {
            @Override
            public String getFilename() {
                return audioFile.getOriginalFilename();
            }
        });
        builder.part("model", "whisper-1");
        builder.part("language", "ko"); // 한국어 지정

        try {
            String response = openAIWebClient.post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode jsonNode = objectMapper.readTree(response);
            String transcription = jsonNode.get("text").asText();
            
            logger.info("✅ Whisper API 응답: {}", transcription);
            return transcription;
        } catch (Exception e) {
            logger.error("❌ Whisper API 호출 실패", e);
            throw new RuntimeException("음성 인식 실패: " + e.getMessage(), e);
        }
    }

    /**
     * GPT API를 사용하여 대화 처리
     */
    public String chat(List<Map<String, String>> messages) {
        logger.info("💬 GPT API 호출 시작 - 메시지 수: {}", messages.size());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "openai/gpt-oss-20b:free");
        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.2);
        requestBody.put("max_tokens", 1000);

        try {
            String response = openRouterWebClient.post()
                    .uri("/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode jsonNode = objectMapper.readTree(response);
            String content = jsonNode.get("choices").get(0).get("message").get("content").asText();
            
            logger.info("✅ GPT API 응답: {}", content);
            return content;
        } catch (Exception e) {
            logger.error("❌ GPT API 호출 실패", e);
            throw new RuntimeException("AI 대화 처리 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Function calling을 포함한 GPT API 호출
     */
    public JsonNode chatWithFunctions(List<Map<String, String>> messages, List<Map<String, Object>> functions) {
        logger.info("💬 GPT API (with functions) 호출 시작");

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "openai/gpt-oss-20b:free");
        requestBody.put("messages", messages);
        requestBody.put("functions", functions);
        requestBody.put("function_call", "auto");
        requestBody.put("temperature", 0.7);

        try {
            String response = openRouterWebClient.post()
                    .uri("/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode jsonNode = objectMapper.readTree(response);
            logger.info("✅ GPT API (with functions) 응답 수신");
            return jsonNode;
        } catch (Exception e) {
            logger.error("❌ GPT API (with functions) 호출 실패", e);
            throw new RuntimeException("AI 대화 처리 실패: " + e.getMessage(), e);
        }
    }
}

