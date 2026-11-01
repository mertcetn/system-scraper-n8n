# AGENTS.md

Bu dosya, bu projede çalışan AI agent'lar için genel kurallar, mimari prensipler ve çalışma sınırlarıdır. 
Teknik detaylar, workflow yapıları, veri modelleri ve kod implementasyonu için [IMPLEMENTATION.md](./IMPLEMENTATION.md) dosyasına başvurun.

---

## 📌 Proje Özeti

Türkiye'nin popüler donanım sitelerinden (Gaming.gen.tr, GameGaraj, İtopya, PcKolik, Vatan Bilgisayar, MediaMarkt vb.) hazır sistem fiyatlarını periyodik olarak tarayıp, kullanıcının belirlediği filtrelere uyan sistemlerde fiyat düşüşü olduğunda Discord üzerinden (kanala veya özel DM ile) bildirim gönderen n8n tabanlı bir otomasyon sistemidir.

Örnek kullanım: *"Sadece 5060 içeren sistemleri takip et, fiyat %5 düşerse haber ver."*

Bu sitelerin genel bir açık API'si bulunmamaktadır; veri sitelerin gömülü veri yapılarından (JSON/Next.js/JSON-LD) veya sayfa HTML'inden çekilir.

---

## 🏛️ Genel Mimari Yaklaşım

- **Yürütme & Zamanlama:** Zamanlama, veri çekme, parse, fiyat karşılaştırma ve bildirim gönderimi n8n workflow'ları ile yürütülür.
- **Veri Çekme Önceliği:** Mümkünse öncelikle sitelerin kendi gömülü veri kaynağı (Next.js RSC, JSON-LD, dahili JSON) tercih edilir; sayfa DOM ayrıştırması ikinci seçenek, tarayıcı otomasyonu son çaredir.
- **Dinamik Yönetim:** Takip filtreleri Discord Slash komutları üzerinden dinamik olarak yönetilir (ekle, sil, listele, eşik değiştir).
- **Kalıcı Depolama:** Fiyat geçmişi ve filtreler n8n Data Table üzerinde tutulur.

---

## 🛡️ Güvenlik ve Gizlilik Kuralları (Kritik)

- **Sırlar Asla Kodda Bulunamaz:** Token, webhook adresi, API anahtarı, Discord Public Key veya özel kimlik bilgileri workflow JSON dosyalarına, git reposuna veya loglara yazılmaz.
- **Kullanıcı Girdisi:** Kullanıcıdan gelen Discord komut parametreleri güvenilmez kabul edilir; sanitize edilir ve sınırlandırılır.
- **Git Koruma:** `bilgiler.txt`, `.env`, `.agents/` ve token içeren tüm dosyalar `.gitignore` kapsamındadır ve hiçbir koşulda uzak repoya pushlanamaz.

---

## 🤖 AI Agent Çalışma ve Davranış İlkeleri

1. **Doğrulamadan Varsayım Yapma:** Sayfa yapısı veya alan adlarını tahmin etme; gerçek HTTP yanıtını inceleyip doğrula. Doğrulayamadıysan bunu açıkça belirt.
2. **Sitelere Saygılı Tarama:** İstekler arasına gerektiğinde gecikme koy, gereksiz sayfa yinelemelerinden kaçın (örneğin tüm veriyi ilk sayfada veren PcKolik veya Itopya'da gereksiz 13 sayfa taraması yapma), robots.txt kurallarına uy.
3. **Bot Koruması:** Bot koruması veya Cloudflare engeli ile karşılaşırsan atlatmaya çalışıp siteyi zorlama. Dur, durumu bildir, alternatif öner.
4. **Hatalarda Sessiz Kalma:** Sayfa yapısı değişir ve parse bozulursa (0 ürün çekilmesi vb.) durumu gizleme; debug bildirimleri ve hata yolları ile durumu görünür kıl.
5. **Stok ve İndirim Dürüstlüğü:** Stokta olmayan (`in_stock: false`) bir ürün indirim sayılmaz. Gerçek bir fiyat düşüşü yoksa sahte bildirim üretilemez.
6. **Canlı Workflow Değişiklikleri:** Canlı workflow'lara dokunurken dikkatli ol, test ortamında veya manual execution ile doğrula. Kullanıcının filtre ve fiyat geçmişini sormadan silme.

---

## 📋 Bir Görevin "Bitti" Sayılması İçin Kriterler

1. Gerçek siteler üzerinde veri çekmenin çalıştığı execution çıktısıyla gösterildi.
2. Filtreler olumlu ve olumsuz örneklerle test edildi (örn: `"5060"` eşleşir, `"5060 Ti"` eşleşmez).
3. Hatalı veya değişen ürünlerde sahte indirim üretilmediği doğrulandı.
4. Dosyalarda ve export edilen workflow'larda hiçbir gizli bilgi kalmadı.
5. Yapılan değişiklikler [IMPLEMENTATION.md](./IMPLEMENTATION.md) dosyasına işlendi.
