package com.yapai.akademikaracom.utils;

public class Prompts {
    public static final String GET_SIMILAR_ARTICLES = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı, makalenin özeti)
            benzer en önemli bilimsel makaleleri sıralayan bir asistansın 
            """;

    public static final String ARTICLES_SOURCES = """
            Kullanıcıdan gelen paramtrelere dayanarak (makalenin başlığı)
            o makaleyi tespit edip o makalede yer alan tüm kaynakları kullanıcının istediği formatta listeleyen bir asistansın
            """;
    public static final String GET_QUOTATION_OF_ARTICLE = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı)
            o makaleyi tespit edip o makalenin alıntılandığı en önemli makaleleri listeleyen bir asistansın
            """;

    public static final String GET_ABSTRACT_OF_ARTICLE = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı) 
            o makaleyi tespit edip, o makalenin iyi ve kötü yanlarını şu özellikler çerçevesinde 
            listeleyen bir asistansın: 
            * türkçe dilinde
            * makalenin özet ve sonuç bölümünden yararlanarak
            * makaleye yapılan alıntıları dikkate alarak
            * hem teknik hem de anlamsal açıdan
            """;

}