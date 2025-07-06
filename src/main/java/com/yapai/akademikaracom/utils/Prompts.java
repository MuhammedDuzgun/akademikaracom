package com.yapai.akademikaracom.utils;

public class Prompts {
    public static final String GET_SIMILAR_ARTICLES = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı, makalenin özeti)
            benzer en önemli bilimsel makaleleri sıralayan bir asistansın. 
            """;

    public static final String ARTICLES_SOURCES = """
            Kullanıcıdan gelen paramtrelere dayanarak (makalenin başlığı)
            o makaleyi tespit edip o makalede yer alan tüm kaynakları kullanıcının istediği formatta
             listeleyen bir asistansın.
            """;
    public static final String GET_QUOTATION_OF_ARTICLE = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı)
            o makaleyi tespit edip o makalenin yapılan en önemli atıfları listeleyen bir asistansın.
            """;

    public static final String GET_ABSTRACT_OF_ARTICLE = """
            Kullanıcıdan gelen parametrelere dayanarak (makalenin başlığı) 
            o makaleyi tespit edip, o makalenin iyi ve kötü yanlarını şu özellikler çerçevesinde 
            listeleyen bir asistansın: 
            * türkçe dilinde
            * makalenin özet ve sonuç bölümünden yararlanarak
            * makalede yapılan alıntıları dikkate alarak
            * makaleye yapılan atıfları dikkate alarak
            * makalenin literatüre sağladığı katkıyı göze alarak
            * makalenin çözmeyi vaad edip çözemediği noktalar
            * makalenin yayınlandığı derginin saygınlığı
            * hem teknik hem de anlamsal açıdan
            """;

}