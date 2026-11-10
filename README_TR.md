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
- **10'ar 10'ar Sayfalı Gezinti:** `/ara` ve `/debug` komutlarında Discord butonlarıyla sayfalar arasında gezinebilme; aramada filtreler ve sıralama korunur.

---

## Discord Slash Komutları

Bot üzerindeki slash komutları dinamik olarak çalışır:

| Komut | Açıklama |
| :--- | :--- |
| `/filtre-ekle` | Yeni takip filtresi ekler. Parametreler: `dahil`, `haric`, `min_fiyat`, `max_fiyat`, `esik_yuzde`, `site`, `dm`. `dahil` girilmezse tüm sistemleri genel takip eder. |
| `/filtre-listele` | Kayıtlı tüm aktif takip filtrelerini listeler. |
| `/filtre-sil` | Belirtilen ID'ye sahip takip filtresini siler. |
| `/esik-guncelle` | Filtrenin indirim tetikleme yüzdesini günceller (Örn: %5'ten %10'a). |
| `/ara` | Stoktaki hazır sistemleri arar. Opsiyonel `model`, `site` ve `siralama` alanlarını alır. Sıralama seçenekleri: **En ucuz** (varsayılan) ve **En pahalı**. Sayfalar arasında filtreler ve sıralama korunur. |
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

## Arama Örnekleri

`/ara` varsayılan olarak yalnızca son **72 saat** içinde görülen sistemleri gösterir; tam 72 saatlik kayıt dahildir. Son görülme zamanı `last_checked_at` alanından alınır. Opsiyonel **`eskiler:true`** alanı eski kayıtları da dahil eder: `/ara model:5060 eskiler:true`. Tarihi eksik veya geçersiz kayıtlar da yalnızca bu seçenekle görünür. Stok, model, site ve sıralama kuralları uygulanmaya devam eder. Sayfalama bu seçimi korur. Bu filtre kayıtları veya fiyat geçmişini silmez; debug raporlarının davranışı değişmez.

- `/ara model:5060`: eşleşen stoktaki sistemleri en ucuzdan başlayarak listeler.
- `/ara model:5060 siralama:En pahalı`: eşleşen sistemleri en pahalıdan başlayarak listeler.

Discord komut tanımı [discord/ara.command.json](./discord/ara.command.json) dosyasındadır. `siralama` alanının API değerleri `en_ucuz` ve `en_pahali` olarak tanımlıdır. Başka bir kurulumda workflow ile birlikte Discord komut kaydı da güncellenmelidir. Uzun ürün adları listede kısaltılır; ürün bağlantıları korunur. Arama testleri: `node tests/search-command.cjs`.

## Fiyat Geçmişi Grafikleri

`/ara` sonuçlarında her sistem için numaralı **Bilgi** butonu bulunur. Basıldığında herkesin görebildiği bir grafik mesajı açılır; başlangıçta **1 hafta** seçilidir. Grafiğin altındaki **1 Hafta / 1 Ay / 1 Yıl / Max** butonları aynı mesajın grafiğini günceller. Mesajı gören kullanıcılar dönem seçimini değiştirebilir; seçili buton vurgulanır. Aynı anda yalnızca bir grafik gösterilir.

| Grafik | Saklanan fiyatlar |
| --- | --- |
| 1 hafta | Her günün stokta görülen en düşük fiyatı |
| 1 ay | Her haftanın stokta görülen en düşük fiyatı |
| 1 yıl | Her ayın stokta görülen en düşük fiyatı |
| Max | Kaydedilen tüm aylık minimum fiyatlar |

Her grafiğin altında ilgili dönemin en düşük fiyatı ve görüldüğü gün yazılır. Aynı dönem içindeki diğer fiyatlar saklanmaz. Minimum birden fazla gün görülürse ilk gözlem günü korunur. Tarihler İstanbul saatine göre hesaplanır; haftalar pazartesi başlar. Gözlem olmayan günler boş bırakılır; geçmiş fiyatlar uydurulmaz.

Grafikler turkuaz fiyat çizgisi kullanır. Szum'un doğrulanan çıktısı açık zeminlidir; QuickChart ve yerel çizici koyu tasarımı kullanır. Görseller **Szum → QuickChart → yerel PNG** sırasıyla oluşturulur. Kota aşımı dışında zaman aşımı, bağlantı hatası, HTTP hatası veya geçersiz PNG de sonraki yönteme geçişi tetikler. Her dış istek için 8 saniye zaman aşımı uygulanır; otomatik tekrar yoktur. Yerel yedek çizici gömülü, kenar yumuşatmalı Segoe UI harfleri kullanır; font kurulumu veya GPU gerekmez.

Günlük noktalar son 7 gün, haftalık noktalar son 30 günle kesişen takvim haftaları için tutulur. Yıllık grafik son 12 takvim ayını, Max tüm aylık kayıtları gösterir. Aylık geçmiş süresiz saklanır; büyüyen kataloglarda Data Table kapasitesi izlenmelidir. Ürün kimliği değiştiğinde eski aylık seri arşivlenir ve yeni ürünün grafiğine karıştırılmaz.

Dış servislere yalnızca seçili dönemin herkese açık fiyat noktaları ve minimum fiyat/tarih metni gönderilir; Discord kullanıcı bilgileri, takip filtreleri veya anahtarlar veri gövdesine eklenmez. Kayıt olmayan dönemlerde API çağrısı atlanır. Discord'un görselleri alabilmesi için grafik endpoint'i herkese açık fiyat verisini sunar.

[Szum ücretsiz planı](https://szum.io/chart-image-api) aylık 500 üretim içerir. QuickChart ücretsiz API'si anahtarsız çalışır. [Nisan 2025 tarihli resmi topluluk yanıtı](https://community.quickchart.io/t/rate-limits-for-quickchart-free-plan/722) dakikada 60, ayda 1.000 görsel belirtir; bu geçmiş rakamlar güncel kota garantisi değildir. Her iki servis de başarısız olursa yerel çizim kullanılır. Her yeni görsel isteğinde sıra yeniden Szum'dan başlar; kalıcı kota önbelleği yoktur.

### Mevcut Kuruluma Ekleme

1. `price_history` tablosuna string tipinde `chart_history` kolonu ekleyin.
2. Ana iki workflow'un güncel export'larını, `render-price-history-chart.json` ve `render-external-price-chart.json` dosyalarını içe aktarın; Data Table bağlantılarını kendi tablolarınıza yönlendirin.
3. n8n'de `Szum API` isimli **Bearer Auth** credential oluşturup Bearer Token alanına Szum anahtarını girin. Dış çizicinin `Render With Szum` düğümünde bu credential'ı seçin. Yerel `.env` içindeki `SZUM_KEY`, n8n credential'ını otomatik doldurmaz. QuickChart için anahtar gerekmez. Ana çizicideki `Render External Chart` düğümünde içe aktarılan dış çizici workflow'unu seçin; import edilen ID'ler yeniden bağlanmalıdır. Manuel kontrollerden sonra önce dış çiziciyi, ardından ana grafik workflow'unu yayınlayın. `Format Graph Info` düğümündeki `YOUR_PRICE_CHART_ENDPOINT` yer tutucusunu doğrulanmış üretim adresiyle değiştirin. Statik webhook yolu `/webhook/price-history-chart` şeklindedir.
4. İsteğe bağlı `initialize-price-graph-history.json` workflow'unu manuel çalıştırarak mevcut ürünlerin son gerçek fiyatı ve kontrol zamanını başlangıç kaydı olarak aktarın. Yalnızca boş `chart_history` alanları doldurulur; mevcut fiyat ve filtreler değiştirilmez. Bu workflow zamanlanmaz ve bildirim göndermez.

Testler: `node tests/search-command.cjs`, `node tests/price-graphs.cjs`, `node tests/chart-png.cjs`, `node tests/graph-workflows.cjs`, `node tests/chart-providers.cjs`.

Aşağıdaki kaynak ölçümleri yerel yedek çiziciye aittir. Dış servis başarılı olduğunda görseli servis çizer; n8n veri hazırlama, indirme ve PNG doğrulamasını yapar. İki servisin de zaman aşımına uğraması yerel çizime geçişi yaklaşık 16 saniye, ek workflow süresi kadar geciktirebilir.

Kaynak kullanımını yerelde ölçmek için `node --expose-gc scripts/benchmark-chart.cjs` komutunu çalıştırın; tek yeni süreç ölçümü için `--single` ekleyin. Bu ölçüm n8n sunucusunun, task runner'ın veya veritabanının toplam bellek maliyeti değildir. Görsel üretimi grafik istendiğinde çalışır; saatlik taramada görsel üretilmez. Ölçüm ayrıntıları [IMPLEMENTATION.md](./IMPLEMENTATION.md) dosyasındadır.
