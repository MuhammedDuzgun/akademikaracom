package com.yapai.akademikaracom.controller;

import com.yapai.akademikaracom.request.GetKeywordsRequest;
import com.yapai.akademikaracom.response.ArticleAnalyze;
import com.yapai.akademikaracom.response.KeywordsResponse;
import com.yapai.akademikaracom.service.ai.ArticleAIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleAIService articleAIService;

    public ArticleController(ArticleAIService articleAIService) {
        this.articleAIService = articleAIService;
    }

    @PostMapping("/analyze-article")
    public ResponseEntity<ArticleAnalyze> analyzePdfArticle(@RequestParam MultipartFile file) throws IOException {
        ArticleAnalyze analyze = articleAIService.analyzePdfArticle(file);
        return ResponseEntity.ok(analyze);
    }

    @PostMapping("/keywords")
    public ResponseEntity<KeywordsResponse> getKeywordsFromAbstract(@RequestBody GetKeywordsRequest request) {
        KeywordsResponse keywordsFromAbstract = articleAIService.getKeywordsFromAbstract(request);
        return ResponseEntity.ok(keywordsFromAbstract);
    }

}