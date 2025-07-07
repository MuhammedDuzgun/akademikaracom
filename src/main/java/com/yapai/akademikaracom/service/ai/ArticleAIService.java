package com.yapai.akademikaracom.service.ai;

import com.yapai.akademikaracom.response.ArticleAnalyze;
import com.yapai.akademikaracom.response.ArticleResponse;
import com.yapai.akademikaracom.request.GetArticleRequest;
import com.yapai.akademikaracom.utils.Prompts;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
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

    public ArticleAnalyze analyzePdfArticle(MultipartFile file) throws IOException {
        String pdfArticle = extractTextFromPdf(file);
        return clientBuilder
                .defaultSystem(Prompts.PDF_ARTICLE_ANALYZER)
                .build()
                .prompt()
                .user(u-> u.text("makale : " + pdfArticle))
                .call()
                .entity(new ParameterizedTypeReference<>() {});
    }

    private String extractTextFromPdf(MultipartFile file) throws IOException {
        try {
            InputStream inputStream = file.getInputStream();
            PDDocument document = Loader.loadPDF(inputStream.readAllBytes());
            return new PDFTextStripper().getText(document);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}