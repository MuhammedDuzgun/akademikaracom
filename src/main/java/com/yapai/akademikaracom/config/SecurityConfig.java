package com.yapai.akademikaracom.config;

import com.yapai.akademikaracom.service.crud.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

import java.io.IOException;

@Configuration
public class SecurityConfig {

    private final UserService userService;

    public SecurityConfig(UserService userService) {
        this.userService = userService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        return
                httpSecurity
                        .cors(AbstractHttpConfigurer::disable)
                        .csrf(AbstractHttpConfigurer::disable)
                        .authorizeHttpRequests(registry -> {
                            registry.requestMatchers("/",
                                    "/index.html",
                                    "/login.html",
                                    "/style.css",
                                    "/main.js").permitAll();
                            registry.requestMatchers("/test/**").permitAll();
                            registry.requestMatchers("/login").permitAll();
                            registry.requestMatchers("/api/v1/articles/**").permitAll();
                            registry.requestMatchers("/api/v1/users/**").authenticated();
                            registry.requestMatchers("/api/v1/libraries/**").authenticated();
                        })
                        .oauth2Login(oauth2login -> {
                            oauth2login.loginPage("/login");
                            oauth2login.successHandler(new AuthenticationSuccessHandler() {
                                @Override
                                public void onAuthenticationSuccess(HttpServletRequest request,
                                                                    HttpServletResponse response,
                                                                    Authentication authentication)
                                        throws IOException, ServletException {
                                    userService.addUser(authentication);
                                    authentication.getCredentials();
                                    response.sendRedirect("/");
                                }
                            });
                        })
                        .exceptionHandling(exception -> exception
                                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                        .build();
    }
}