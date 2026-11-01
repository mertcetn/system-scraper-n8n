# Donanım Fiyat Takip & Discord Bildirim Sistemi (n8n)
[English](./README.md) | [Türkçe](./README_TR.md)

Bu proje, Türkiye'nin önde gelen hazır sistem ve donanım sitelerindeki ürün fiyatlarını saat başı otomatik olarak tarayan, fiyat geçmişini saklayan ve kullanıcının belirlediği filtrelere uyan sistemlerde fiyat düşüşü olduğunda Discord üzerinden (kanala veya DM ile) bildirim gönderen **n8n tabanlı** bir otomasyon sistemidir.

---

## Desteklenen Siteler

| Kaynak Site | Tarama Yöntemi | Ortalama Taranan Sistem Sayısı |
| :--- | :--- | :--- |
| **Gaming.gen.tr** | HTML & Bileşen Listesi Ayrıştırma | ~200+ sistem |
| **GameGaraj** | JSON-LD & DOM Kart Ayrıştırma | ~90+ sistem |
| **İtopya** | Tek İstek (pg=40) Kapsamlı Ayrıştırma | ~780+ sistem |
| **PcKolik** | Next.js Gömülü JSON Payload Ayrıştırma | ~300+ sistem |
| **Vatan Bilgisayar** | Sayfalı Kategori Ayrıştırma | ~110+ sistem |
| **MediaMarkt** | JSON-LD ItemList Ayrıştırma | ~25+ sistem |
| **Toplam** | — | **~1.500+ Hazır Sistem** |

---

## Temel Özellikler

-  **Periyodik Tarama (Saatte Bir):** Sitelerin kullanım şartlarına ve robots.txt kurallarına uygun, siteleri yormayan verimli tarama.
-  **Akıllı ve Hassas Model Eşleştirme:** `5060` aramasında `5060 Ti` veya `5060 Super` gibi farklı modellerin karışmasını engelleyen tam kelime sınırı (`\b`) ve regex mimarisi.
-  **Sahte İndirim Koruması (Anti-False Drop Baseline):** Ürünün adı veya yapısı tamamen değiştiğinde bunu indirim değil yeniden eşleşme sayarak hatalı bildirim gönderilmesini önleyen güvenlik mekanizması.
-  **Stok Durumu Takibi:** Tükendi / Stokta Yok durumundaki ürünler indirim sayılmaz ve bildirim üretmez.
-  **Kanal veya DM Bildirimi:** Kullanıcı dilerse bildirimi ortak bir kanala almak yerine doğrudan Discord DM'ine alabilir.
-  **10'ar 10'ar Sayfalı Gezinti:** `/en-ucuz` ve `/debug` komutlarında Discord butonlarıyla sayfalar arasında gezinebilme (` Önceki`, `Sonraki `).

---

## Discord Slash Komutları

Bot üzerindeki slash komutları dinamik olarak çalışır:

| Komut | Açıklama |
| :--- | :--- |
| `/filtre-ekle` | Yeni takip filtresi ekler. Parametreler: `dahil`, `haric`, `min_fiyat`, `max_fiyat`, `esik_yuzde`, `site`, `dm`. `dahil` girilmezse tüm sistemleri genel takip eder. |
| `/filtre-listele` | Kayıtlı tüm aktif takip filtrelerini listeler. |
| `/filtre-sil` | Belirtilen ID'ye sahip takip filtresini siler. |
| `/esik-guncelle` | Filtrenin indirim tetikleme yüzdesini günceller (Örn: %5'ten %10'a). |
| `/en-ucuz` | Stokta olan en ucuz hazır sistemleri listeler. Model ve site filtresi alabilir; 10'ar adetlik sayfalar halinde butonlarla gezilebilir. |
| `/debug` | Sitelerin taranma başarı durumlarını ve taranan sistem sayılarını belirtilen kanala raporlar. `verbose: true` seçilirse tüm taranan sistemler 10'ar 10'ar butonlu sayfalarla listelenir. |

---

## Dosya ve Dizin Yapısı

```text
system-scraper-n8n/
 workflows/
    donanim-fiyat-takipcisi.json          # Tarama, karşılaştırma ve bildirim workflow'u
    discord-slash-komut-yoneticisi.json   # Discord Webhook & Slash komut yönetim workflow'u
 AGENTS.md                                 # Proje kuralları ve agent prensipleri
 .gitignore                                # Gizli anahtar ve ortam dosyası filtreleri
 README.md                                 # Proje dokümantasyonu
```

---

## Kurulum & n8n'e İçe Aktarma

### 1. Workflow'ları İçe Aktarma
1. n8n yönetim panelinize gidin (`https://your-n8n-instance/`).
2. **Workflows -> Add Workflow -> Import from File** diyerek `workflows/` klasöründeki iki JSON dosyasını içe aktarın:
   - `donanim-fiyat-takipcisi.json`
   - `discord-slash-komut-yoneticisi.json`

### 2. Gerekli n8n Data Table'ları
Workflow'ların veri kaydedebilmesi için n8n panelinde aşağıdaki 3 Data Table'ı oluşturun:

1. **`tracking_filters`**
   - Kolonlar: `id` (number), `include_keywords` (string), `exclude_keywords` (string), `min_price` (number), `max_price` (number), `drop_threshold_percent` (number), `source_site` (string), `is_active` (boolean), `notify_dm` (boolean), `discord_user_id` (string), `created_at` (dateTime).
2. **`price_history`**
   - Kolonlar: `product_id` (string), `source_site` (string), `product_name` (string), `product_url` (string), `current_price` (number), `previous_price` (number), `in_stock` (boolean), `last_checked_at` (dateTime).
3. **`debug_config`**
   - Kolonlar: `id` (number), `channel_id` (string), `verbose` (boolean), `is_active` (boolean), `updated_at` (dateTime).

### 3. Gizli Bilgilerin Tanımlanması
Export dosyalarında aşağıdaki yer tutucular bulunur. Gerçek bot tokenını workflow metin alanlarına yazmayın; n8n credentials üzerinden tanımlayın. Public key yapılandırmasını güvenli biçimde sağlayın ve gerçek kimlik bilgilerini export dosyalarına veya Git reposuna eklemeyin:
- `YOUR_DISCORD_BOT_TOKEN`: Discord Bot Token'ınız (`Bot ...` biçiminde).
- `YOUR_DISCORD_PUBLIC_KEY`: Discord Developer Portal'daki Application Public Key (Etkileşim imza doğrulaması için).
- `YOUR_DISCORD_NOTIFICATION_CHANNEL_ID`: İndirim bildirimlerinin düşeceği varsayılan metin kanalı ID'si.

---

## Güvenlik

- Proje hiçbir gizli API anahtarı, bot token'ı veya kimlik doğrulama başlığı barındırmaz.
- Tüm sırlar `.gitignore` kapsamındadır.



## Teknik Referans ve Bakım

Tablo şemaları ve mimari için [IMPLEMENTATION.md](./IMPLEMENTATION.md), katkı kuralları için [AGENTS.md](./AGENTS.md) dosyasına bakın. İçe aktarma sonrası Data Table düğümlerinde kendi tablolarınızı seçin. Slash komutlarını Discord uygulamasına kaydedip Interactions Endpoint URL alanını webhook adresiyle yapılandırın; saatlik zamanlamayı açmadan önce manuel test yapın.

Yukarıdaki ürün sayıları geçmiş taramalara ait yaklaşık değerlerdir ve güncel kapsam garantisi değildir. n8n workflow değişikliklerini commit öncesinde workflows/ dizinine export edin ve gizli bilgi kontrolü yapın.
