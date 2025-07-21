# akademikara.com

Akademikara, araştırmacılar ve öğrenciler için modern, yapay zeka destekli bir **akademik araştırma asistanıdır**. PDF makale analizi, literatür tarama, yazar/kurum arama ve kişisel kütüphane yönetimi gibi işlevlerle akademik çalışmaları kolaylaştırır.

## Özellikler

- **PDF Makale Analizi:** Yüklediğiniz PDF makaleleri OpenAI destekli yapay zeka ile özetler, anahtar kavramları ve atıfları çıkarır.
- **Literatür Tarama:** Makale özetinden anahtar kelimeler bulur ve bu kelimelerle OpenAlex API üzerinden ilgili akademik çalışmaları listeler.
- **Makale, Yazar ve Kurum Arama:** Gelişmiş filtrelerle makale, yazar ve kurum araması yapabilir, detaylarını görüntüleyebilirsiniz.
- **Kişisel Kütüphane:** Beğendiğiniz makale, yazar ve kurumları kendi kütüphanenize ekleyip yönetebilirsiniz.
- **Google ile Giriş:** OAuth2 ile güvenli Google hesabı ile giriş.
- **Modern ve Duyarlı Arayüz:** Mobil ve masaüstü uyumlu, kullanıcı dostu arayüz.

## Teknolojiler

- **Backend:** Java 21, Spring Boot 3, Spring Data JPA, Spring Security, OAuth2, OpenAI entegrasyonu, MySQL
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (main.js), Responsive Design
- **Ek Kütüphaneler:** Apache PDFBox (PDF okuma), OpenAlex API (akademik veri), Commons FileUpload
- **Yapay Zeka:** OpenAI Chat API (Spring AI ile)
- **Veritabanı:** MySQL

## Kurulum

### Gereksinimler

- Java 21+
- Maven
- MySQL (veya uyumlu bir veritabanı)
- OpenAI API anahtarı
- Google OAuth2 Client ID/Secret

### Ortam Değişkenleri

Aşağıdaki ortam değişkenlerini `.env` dosyası veya sistem ortamı olarak tanımlayın:

```
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-3.5-turbo
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
DB_URL=jdbc:mysql://localhost:3306/akademikara?useSSL=false&serverTimezone=UTC
DB_USERNAME=...
DB_PASS=...
```

### Derleme ve Çalıştırma

```bash
# Bağımlılıkları indir ve projeyi derle
mvn clean install

# Uygulamayı başlat
mvn spring-boot:run
```

Uygulama varsayılan olarak `http://localhost:8080` adresinde çalışır.

## Kullanım

### Giriş

- `/login.html` üzerinden Google hesabınızla giriş yapabilirsiniz.

### Ana Özellikler

- **Makale Analizi:** Ana sayfada PDF yükleyerek makale analizi başlatabilirsiniz.
- **Literatür Araştır:** Makale özetini girerek anahtar kelimeler ve ilgili yayınlara ulaşabilirsiniz.
- **Makale/Yazar/Kurum Arama:** Gelişmiş filtrelerle arama yapabilir, detayları görebilir ve kütüphanenize ekleyebilirsiniz.
- **Kütüphane:** Profil sekmesinden eklediğiniz yazar, makale ve kurumları yönetebilirsiniz.

### API Uç Noktaları (Özet)

- `POST /api/v1/articles/analyze-article` : PDF makale analizi (multipart/form-data)
- `POST /api/v1/articles/keywords` : Makale özetinden anahtar kelime çıkarımı
- `GET/POST/DELETE /api/v1/libraries/*` : Kütüphane işlemleri (yazar, makale, kurum ekle/çek/sil)
- `GET /api/v1/users/profile` : Kullanıcı profil bilgisi

## Proje Yapısı

```
akademikaracom/
├── src/
│   ├── main/
│   │   ├── java/com/yapai/akademikaracom/
│   │   │   ├── controller/      # REST API controller'ları
│   │   │   ├── service/         # Servis katmanı (AI ve CRUD)
│   │   │   ├── entity/          # JPA varlıkları
│   │   │   ├── repository/      # Spring Data JPA repository'leri
│   │   │   ├── config/          # Güvenlik ve genel konfigürasyon
│   │   │   └── ...              # DTO, Exception, Request/Response modelleri
│   │   └── resources/
│   │       ├── static/          # Frontend dosyaları (index.html, main.js, style.css, login.html)
│   │       └── application.properties
├── pom.xml                      # Maven bağımlılıkları
└── README.md
```

## Katkı Sağlama

1. Fork'layın ve yeni bir branch açın.
2. Kodunuzu yazın/test edin.
3. Pull request oluşturun.

## Lisans

Bu proje MIT lisansı ile lisanslanmıştır.

---

Her türlü öneri, hata bildirimi veya katkı için lütfen iletişime geçin: **muhammedduzgun00@gmail.com**

---

> **akademikara.com** – Akademik araştırmalarınızda yapay zekanın gücünü keşfedin! 