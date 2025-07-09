package com.yapai.akademikaracom.controller;

import com.yapai.akademikaracom.dto.UserDto;
import com.yapai.akademikaracom.service.crud.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getAuthenticatedUsersProfile(Authentication authentication) {
        UserDto authenticatedUsersProfile = userService.getAuthenticatedUsersProfile(authentication);
        return ResponseEntity.ok(authenticatedUsersProfile);
    }

}