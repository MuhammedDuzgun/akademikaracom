package com.yapai.akademikaracom.utils;

public class Prompts {
    public static final String articlePrompt = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı, makalenin özeti)
            benzer en önemli bilimsel makaleleri sıralayan bir asistansın 
            """;

    public static final String articlePrompt2 = """
            Kullanıcıdan gelen paramtrelere dayanarak (makalenin başlığı)
            o makaleyi tespit edip o makalede yer alan kaynakları IEEEE formatında listeleyen bir asistansın
            """;
}