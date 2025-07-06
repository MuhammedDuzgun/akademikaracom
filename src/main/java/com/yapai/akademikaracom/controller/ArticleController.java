package com.yapai.akademikaracom.controller;

import com.yapai.akademikaracom.request.GetAbstractOfArticleRequest;
import com.yapai.akademikaracom.request.GetArticlesSourcesRequest;
import com.yapai.akademikaracom.request.GetQuotationOfArticleRequest;
import com.yapai.akademikaracom.response.AbstractOfArticleResponse;
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


    @PostMapping("/sources")
    public ResponseEntity<List<ArticleSourceResponse>> getArticleSources
            (@RequestBody GetArticlesSourcesRequest request) {
        List<ArticleSourceResponse> sourcesOfArticle = articleAIService.getSourcesOfArticle(request);
        return ResponseEntity.ok(sourcesOfArticle);
    }

    @PostMapping("/quotations")
    public ResponseEntity<List<ArticleResponse>> getQuotedArticles
            (@RequestBody GetQuotationOfArticleRequest request) {
        List<ArticleResponse> quotationOfArticle = articleAIService.getQuotationOfArticle(request);
        return ResponseEntity.ok(quotationOfArticle);
    }

    @PostMapping("/abstract")
    public ResponseEntity<AbstractOfArticleResponse> getAbstractOfArticle
            (@RequestBody GetAbstractOfArticleRequest request) {
        AbstractOfArticleResponse abstractOfArticle = articleAIService.getAbstractOfArticle(request);
        return ResponseEntity.ok(abstractOfArticle);
    }

}