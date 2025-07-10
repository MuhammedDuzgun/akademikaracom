package com.yapai.akademikaracom.service.ai;

import com.yapai.akademikaracom.request.GetKeywordsRequest;
import com.yapai.akademikaracom.response.ArticleAnalyze;
import com.yapai.akademikaracom.response.KeywordsResponse;
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

@Service
public class ArticleAIService {

    private ChatClient.Builder clientBuilder;

    public ArticleAIService(ChatClient.Builder clientBuilder) {
        this.clientBuilder = clientBuilder;
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

    public KeywordsResponse getKeywordsFromAbstract(GetKeywordsRequest request) {
        return clientBuilder
                .defaultSystem(Prompts.KEY_WORD_FOUNDER)
                .build()
                .prompt()
                .user(u-> u.text("makale özeti : " + request.content()))
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