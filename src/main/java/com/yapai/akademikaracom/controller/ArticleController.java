package com.yapai.akademikaracom.controller;

import com.yapai.akademikaracom.response.ArticleResponse;
import com.yapai.akademikaracom.request.GetArticleRequest;
import com.yapai.akademikaracom.response.ArticleSourceResponse;
import com.yapai.akademikaracom.service.ai.ArticleAIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleAIService articleAIService;

    public ArticleController(ArticleAIService articleAIService) {
        this.articleAIService = articleAIService;
    }

    @PostMapping
    public ResponseEntity<List<ArticleResponse>> getReleatedArticles(@RequestBody GetArticleRequest request) {
        List<ArticleResponse> response = articleAIService.getArticles(request);
        return ResponseEntity.ok(response);
    }


    @GetMapping("/sources")
    public ResponseEntity<List<ArticleSourceResponse>> getArticleSources(@RequestParam String articleTitle) {
        List<ArticleSourceResponse> sourcesOfArticle = articleAIService.getSourcesOfArticle(articleTitle);
        return ResponseEntity.ok(sourcesOfArticle);
    }

}