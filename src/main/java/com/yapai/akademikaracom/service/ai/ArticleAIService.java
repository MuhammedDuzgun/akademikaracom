package com.yapai.akademikaracom.service.ai;

import com.yapai.akademikaracom.response.ArticleResponse;
import com.yapai.akademikaracom.request.GetArticleRequest;
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
}