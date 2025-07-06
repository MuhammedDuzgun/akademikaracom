package com.yapai.akademikaracom.service.ai;

import com.yapai.akademikaracom.request.GetAbstractOfArticleRequest;
import com.yapai.akademikaracom.request.GetArticlesSourcesRequest;
import com.yapai.akademikaracom.request.GetQuotationOfArticleRequest;
import com.yapai.akademikaracom.response.AbstractOfArticleResponse;
import com.yapai.akademikaracom.response.ArticleResponse;
import com.yapai.akademikaracom.request.GetArticleRequest;
import com.yapai.akademikaracom.response.ArticleSourceResponse;
import com.yapai.akademikaracom.utils.Prompts;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArticleAIService {

    private ChatClient.Builder clientBuilder;

    public ArticleAIService(ChatClient.Builder clientBuilder) {
        this.clientBuilder = clientBuilder;
    }


    public List<ArticleResponse> getArticles(GetArticleRequest request) {
        return clientBuilder
                .defaultSystem(Prompts.GET_SIMILAR_ARTICLES)
                .build()
                .prompt()
                .user(u -> u.text("makalenin başlığı : " + request.title() +
                        "makalenin özeti : " + request.articleAbstract()
                ))
                .call()
                .entity(new ParameterizedTypeReference<>() {});
    }

    public List<ArticleSourceResponse> getSourcesOfArticle(GetArticlesSourcesRequest request) {
        return clientBuilder
                .defaultSystem(Prompts.ARTICLES_SOURCES)
                .build()
                .prompt()
                .user(u-> u.text("makalenin başlığı : " + request.title() +
                        "kaynaklarının formatı : " + request.sourceFormat()
                ))
                .call()
                .entity(new ParameterizedTypeReference<>() {});
    }

    public List<ArticleResponse> getQuotationOfArticle(GetQuotationOfArticleRequest request) {
        return clientBuilder
                .defaultSystem(Prompts.GET_QUOTATION_OF_ARTICLE)
                .build()
                .prompt()
                .user(u -> u.text("makalenin başlığı : " + request.articleTitle()))
                .call()
                .entity(new ParameterizedTypeReference<>() {});
    }

    public AbstractOfArticleResponse getAbstractOfArticle(GetAbstractOfArticleRequest request) {
        return clientBuilder
                .defaultSystem(Prompts.GET_ABSTRACT_OF_ARTICLE)
                .build()
                .prompt()
                .user(u-> u.text("makalenin başlığı : " + request.title()))
                .call()
                .entity(new ParameterizedTypeReference<>() {});
    }

}