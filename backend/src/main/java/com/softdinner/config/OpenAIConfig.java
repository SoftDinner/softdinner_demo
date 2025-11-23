package com.softdinner.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class OpenAIConfig {

    @Value("${openai.api-key}")
    private String openAIApiKey;

    @Value("${openai.api-url}")
    private String openAIApiUrl;

    @Value("${openrouter.api-key}")
    private String openRouterApiKey;

    @Value("${openrouter.api-url}")
    private String openRouterApiUrl;

    @Bean(name = "openAIWebClient")
    public WebClient openAIWebClient() {
        return WebClient.builder()
                .baseUrl(openAIApiUrl)
                .defaultHeader("Authorization", "Bearer " + openAIApiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Bean(name = "openRouterWebClient")
    public WebClient openRouterWebClient() {
        return WebClient.builder()
                .baseUrl(openRouterApiUrl)
                .defaultHeader("Authorization", "Bearer " + openRouterApiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}


