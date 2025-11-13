package com.softdinner;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;

@SpringBootApplication
public class SoftDinnerApplication {
    public static void main(String[] args) {
        // Load .env.local file if it exists
        Dotenv dotenv = Dotenv.configure()
                .filename(".env.local")
                .ignoreIfMissing()
                .load();
        
        // Set system properties from .env.local
        if (dotenv != null) {
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });
        }
        
        SpringApplication.run(SoftDinnerApplication.class, args);
    }
}

