package com.softdinner.service;

import com.softdinner.dto.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.*;
import org.springframework.web.reactive.function.client.*;
import reactor.core.publisher.*;

import java.util.*;

@Slf4j
@Service
public class AuthService {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;
    private final String supabaseAnonKey;

    public AuthService(
            @Qualifier("supabaseWebClient") WebClient supabaseWebClient,
            @Qualifier("supabaseUrl") String supabaseUrl,
            @Qualifier("supabaseServiceRoleKey") String supabaseServiceRoleKey,
            @Qualifier("supabaseAnonKey") String supabaseAnonKey
    ) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
        this.supabaseAnonKey = supabaseAnonKey;
    }

    public AuthResponseDTO signup(SignupRequestDTO request) {
        try {
            // 0. Check if user already exists in auth.users and delete if exists
            // Supabase Admin API를 사용하여 이메일로 사용자 조회 및 삭제
            try {
                // Get all users and filter by email (Admin API doesn't support direct email filtering)
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> allUsers = supabaseWebClient.get()
                        .uri(supabaseUrl + "/auth/v1/admin/users")
                        .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                        .header("apikey", supabaseServiceRoleKey)
                        .retrieve()
                        .bodyToMono(List.class)
                        .block();

                if (allUsers != null) {
                    // Find user by email
                    Map<String, Object> existingUser = allUsers.stream()
                            .filter(user -> request.getEmail().equalsIgnoreCase((String) user.get("email")))
                            .findFirst()
                            .orElse(null);

                    if (existingUser != null) {
                        String existingUserId = (String) existingUser.get("id");
                        log.warn("User already exists in auth.users with id: {}, deleting before recreating", existingUserId);
                        
                        // Delete existing user from auth.users
                        supabaseWebClient.delete()
                                .uri(supabaseUrl + "/auth/v1/admin/users/" + existingUserId)
                                .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                                .header("apikey", supabaseServiceRoleKey)
                                .retrieve()
                                .bodyToMono(Void.class)
                                .block();
                        
                        log.info("Deleted existing user from auth.users: {}", existingUserId);
                        
                        // Also delete from public.users if exists
                        try {
                            supabaseWebClient.delete()
                                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + existingUserId)
                                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                                    .header("apikey", supabaseServiceRoleKey)
                                    .retrieve()
                                    .bodyToMono(Void.class)
                                    .block();
                            log.info("Deleted existing user from public.users: {}", existingUserId);
                        } catch (Exception e) {
                            log.warn("Failed to delete from public.users (may not exist): {}", e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Error checking/deleting existing user: {}", e.getMessage());
                // Continue with signup even if check fails
            }

            // 1. Create user in Supabase Auth
            Map<String, Object> authRequest = new HashMap<>();
            authRequest.put("email", request.getEmail());
            authRequest.put("password", request.getPassword());
            authRequest.put("email_confirm", true); // Auto-confirm email (use email_confirm, not email_confirmed)
            authRequest.put("user_metadata", Map.of(
                    "full_name", request.getFullName(),
                    "phone", request.getPhone() != null ? request.getPhone() : "",
                    "address", request.getAddress() != null ? request.getAddress() : ""
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> authResponse = supabaseWebClient.post()
                    .uri(supabaseUrl + "/auth/v1/admin/users")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(authRequest)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), response -> {
                        return response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("Supabase Admin API error: {} - {}", response.statusCode(), errorBody);
                                    
                                    // Parse error response to provide user-friendly messages
                                    try {
                                        ObjectMapper objectMapper = new ObjectMapper();
                                        @SuppressWarnings("unchecked")
                                        Map<String, Object> errorMap = objectMapper.readValue(errorBody, Map.class);
                                        
                                        String errorCode = (String) errorMap.get("error_code");
                                        String errorMsg = (String) errorMap.get("msg");
                                        
                                        if ("email_exists".equals(errorCode) || "user_already_registered".equals(errorCode)) {
                                            return Mono.error(new RuntimeException("이미 등록된 이메일 주소입니다. Supabase Dashboard의 Authentication > Users에서 해당 사용자를 삭제한 후 다시 시도해주세요."));
                                        } else if (errorMsg != null) {
                                            return Mono.error(new RuntimeException(errorMsg));
                                        }
                                    } catch (Exception e) {
                                        // If parsing fails, use original error body
                                        log.warn("Failed to parse error response: {}", e.getMessage());
                                    }
                                    
                                    return Mono.error(new RuntimeException("회원가입에 실패했습니다. 다시 시도해주세요."));
                                });
                    })
                    .bodyToMono(Map.class)
                    .block();

            if (authResponse == null) {
                throw new RuntimeException("Failed to create user in Supabase Auth");
            }

            String userId = (String) authResponse.get("id");
            log.info("User created successfully in auth.users with id: {}, email: {}", userId, request.getEmail());

            // 1.5. Verify and update user to ensure email_confirmed and password are set correctly
            // Supabase Admin API sometimes doesn't set these correctly, so we update explicitly
            try {
                // First, get the current user to check status
                @SuppressWarnings("unchecked")
                Map<String, Object> currentUser = supabaseWebClient.get()
                        .uri(supabaseUrl + "/auth/v1/admin/users/" + userId)
                        .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                        .header("apikey", supabaseServiceRoleKey)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
                
                if (currentUser != null) {
                    Boolean emailConfirmed = (Boolean) currentUser.get("email_confirmed");
                    log.info("Current user email_confirmed status: {}", emailConfirmed);
                    
                    // Update user with password and email_confirmed
                    // Supabase Admin API uses "email_confirm" (not "email_confirmed") for updating
                    Map<String, Object> userUpdateRequest = new HashMap<>();
                    userUpdateRequest.put("password", request.getPassword());
                    userUpdateRequest.put("email_confirm", true); // Use email_confirm for update
                    
                    @SuppressWarnings("unchecked")
                    Map<String, Object> updatedUser = supabaseWebClient.put()
                            .uri(supabaseUrl + "/auth/v1/admin/users/" + userId)
                            .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                            .header("apikey", supabaseServiceRoleKey)
                            .header("Content-Type", "application/json")
                            .bodyValue(userUpdateRequest)
                            .retrieve()
                            .bodyToMono(Map.class)
                            .block();
                    
                    if (updatedUser != null) {
                        Boolean newEmailConfirmed = (Boolean) updatedUser.get("email_confirmed");
                        log.info("Updated user email_confirmed status: {}", newEmailConfirmed);
                    }
                    
                    log.info("Password and email_confirmed updated for user: {}", userId);
                }
            } catch (Exception e) {
                log.error("Failed to update password/email_confirmed for user {}: {}", userId, e.getMessage(), e);
                // Continue anyway - might be set correctly
            }

            // 2. Create user record in users table
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", userId);
            userData.put("email", request.getEmail());
            userData.put("full_name", request.getFullName());
            userData.put("phone", request.getPhone());
            userData.put("address", request.getAddress());
            userData.put("role", request.getRole());
            userData.put("loyalty_tier", "bronze");
            userData.put("total_orders", 0);
            userData.put("total_spent", 0.0);

            // Create user record in users table (returns array)
            @SuppressWarnings("unchecked")
            Map<String, Object>[] userResponseArray = supabaseWebClient.post()
                    .uri(supabaseUrl + "/rest/v1/users")
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .bodyValue(userData)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (userResponseArray == null || userResponseArray.length == 0) {
                throw new RuntimeException("Failed to create user record in database");
            }

            // 3. Build response (자동 로그인 없이 회원가입만 완료)
            // 사용자는 회원가입 후 직접 로그인 페이지에서 로그인해야 함
            UserResponseDTO userDTO = UserResponseDTO.builder()
                    .id(userId)
                    .email(request.getEmail())
                    .fullName(request.getFullName())
                    .phone(request.getPhone())
                    .address(request.getAddress())
                    .role(request.getRole())
                    .loyaltyTier("bronze")
                    .totalOrders(0)
                    .totalSpent(0.0)
                    .build();

            return AuthResponseDTO.builder()
                    .user(userDTO)
                    .role(request.getRole())
                    .message("회원가입이 완료되었습니다. 로그인해주세요.")
                    .build();

        } catch (Exception e) {
            log.error("Error during signup: {}", e.getMessage(), e);
            throw new RuntimeException("Signup failed: " + e.getMessage());
        }
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        try {
            log.info("Login attempt for email: {}", request.getEmail());
            
            // 1. Authenticate with Supabase Auth
            Map<String, Object> authRequest = new HashMap<>();
            authRequest.put("email", request.getEmail());
            authRequest.put("password", request.getPassword());

            log.info("Calling Supabase Auth API: {}", supabaseUrl + "/auth/v1/token?grant_type=password");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> authResponse = supabaseWebClient.post()
                    .uri(supabaseUrl + "/auth/v1/token?grant_type=password")
                    .header("Authorization", "Bearer " + supabaseAnonKey) // Use anon key for login
                    .header("apikey", supabaseAnonKey) // Use anon key for login
                    .header("Content-Type", "application/json")
                    .bodyValue(authRequest)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), response -> {
                        return response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("Supabase Auth login error: {} - {}", response.statusCode(), errorBody);
                                    
                                    // Parse error response to provide user-friendly messages
                                    try {
                                        ObjectMapper objectMapper = new ObjectMapper();
                                        @SuppressWarnings("unchecked")
                                        Map<String, Object> errorMap = objectMapper.readValue(errorBody, Map.class);
                                        
                                        String errorCode = (String) errorMap.get("error_code");
                                        String errorMsg = (String) errorMap.get("msg");
                                        String errorDescription = (String) errorMap.get("error_description");
                                        
                                        log.error("Login error details - code: {}, msg: {}, description: {}", errorCode, errorMsg, errorDescription);
                                        
                                        // Handle specific error codes
                                        if ("invalid_credentials".equals(errorCode) || 
                                            "invalid_grant".equals(errorCode) ||
                                            "email_not_confirmed".equals(errorCode)) {
                                            return Mono.error(new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다."));
                                        } else if ("invalid_password".equals(errorCode)) {
                                            return Mono.error(new RuntimeException("비밀번호가 올바르지 않습니다."));
                                        } else if ("user_not_found".equals(errorCode)) {
                                            return Mono.error(new RuntimeException("등록되지 않은 이메일 주소입니다."));
                                        } else if (errorDescription != null && !errorDescription.isEmpty()) {
                                            // Use error_description if available (usually more user-friendly)
                                            return Mono.error(new RuntimeException(errorDescription));
                                        } else if (errorMsg != null && !errorMsg.isEmpty()) {
                                            return Mono.error(new RuntimeException(errorMsg));
                                        }
                                    } catch (Exception e) {
                                        log.warn("Failed to parse error response: {}", e.getMessage());
                                    }
                                    
                                    return Mono.error(new RuntimeException("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요."));
                                });
                    })
                    .bodyToMono(Map.class)
                    .block();
            
            log.info("Supabase Auth response received: {}", authResponse != null ? "success" : "null");

            if (authResponse == null) {
                throw new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다.");
            }

            // Extract user ID from user object
            @SuppressWarnings("unchecked")
            Map<String, Object> user = (Map<String, Object>) authResponse.get("user");
            if (user == null) {
                throw new RuntimeException("User data not found in login response");
            }
            
            String userId = (String) user.get("id");
            String accessToken = (String) authResponse.get("access_token");
            String refreshToken = (String) authResponse.get("refresh_token");
            
            log.info("Login successful for user: {}, accessToken present: {}, refreshToken present: {}", 
                    userId, accessToken != null, refreshToken != null);
            
            if (accessToken == null || refreshToken == null) {
                log.error("Tokens are null in login response: accessToken={}, refreshToken={}", accessToken, refreshToken);
                throw new RuntimeException("로그인 응답에 토큰이 없습니다.");
            }

            // 2. Get user data from users table
            @SuppressWarnings("unchecked")
            Map<String, Object>[] userDataArray = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (userDataArray == null || userDataArray.length == 0) {
                throw new RuntimeException("User not found in database");
            }

            Map<String, Object> userData = userDataArray[0];

            UserResponseDTO userDTO = UserResponseDTO.builder()
                    .id((String) userData.get("id"))
                    .email((String) userData.get("email"))
                    .fullName((String) userData.get("full_name"))
                    .phone((String) userData.get("phone"))
                    .address((String) userData.get("address"))
                    .role((String) userData.get("role"))
                    .loyaltyTier((String) userData.get("loyalty_tier"))
                    .totalOrders((Integer) userData.get("total_orders"))
                    .totalSpent(((Number) userData.get("total_spent")).doubleValue())
                    .build();

            return AuthResponseDTO.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .user(userDTO)
                    .role(userDTO.getRole())
                    .message("Login successful")
                    .build();

        } catch (Exception e) {
            log.error("Error during login: {}", e.getMessage(), e);
            throw new RuntimeException("Login failed: " + e.getMessage());
        }
    }

    public UserResponseDTO getCurrentUser(String userId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object>[] userDataArray = supabaseWebClient.get()
                    .uri(supabaseUrl + "/rest/v1/users?id=eq." + userId)
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .retrieve()
                    .bodyToMono(Map[].class)
                    .block();

            if (userDataArray == null || userDataArray.length == 0) {
                throw new RuntimeException("User not found");
            }

            Map<String, Object> user = userDataArray[0];

            return UserResponseDTO.builder()
                    .id((String) user.get("id"))
                    .email((String) user.get("email"))
                    .fullName((String) user.get("full_name"))
                    .phone((String) user.get("phone"))
                    .address((String) user.get("address"))
                    .role((String) user.get("role"))
                    .loyaltyTier((String) user.get("loyalty_tier"))
                    .totalOrders((Integer) user.get("total_orders"))
                    .totalSpent(((Number) user.get("total_spent")).doubleValue())
                    .build();

        } catch (Exception e) {
            log.error("Error getting current user: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get user: " + e.getMessage());
        }
    }
}

