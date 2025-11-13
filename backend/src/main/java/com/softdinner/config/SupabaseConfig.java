package com.softdinner.config;

import org.springframework.beans.factory.annotation.*;
import org.springframework.context.annotation.*;
import org.springframework.web.reactive.function.client.*;

@Configuration
public class SupabaseConfig {
    
    @Value("${supabase.url}")
    private String supabaseUrl;
    
    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;
    
    @Value("${supabase.anon-key}")
    private String anonKey;
    
    @Bean
    public WebClient supabaseWebClient() {
        return WebClient.builder()
                .baseUrl(supabaseUrl != null ? supabaseUrl : "") // NOSONAR - @Value ensures non-null
                .defaultHeader("apikey", serviceRoleKey)
                .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                .build();
    }
    
    @Bean
    public String supabaseUrl() {
        return supabaseUrl;
    }
    
    @Bean
    public String supabaseServiceRoleKey() {
        return serviceRoleKey;
    }
    
    @Bean
    public String supabaseAnonKey() {
        return anonKey;
    }
}

