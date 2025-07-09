package com.yapai.akademikaracom.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String homeController() {
        return "index.html";
    }

    @GetMapping("/login")
    public String loginController() {
        return "login.html";
    }

}