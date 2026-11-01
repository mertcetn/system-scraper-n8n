# AGENTS.md

Bu dosya, bu projede çalışan AI agent'lar için genel kurallar ve bağlamdır. Teknik uygulama detayları agent'a bırakılır, burada sadece yön ve sınırlar vardır.

## Proje özeti

incehesap ve gaming gen tr gibi Türk donanım sitelerinden ürün fiyatlarını periyodik olarak takip edip, kullanıcının belirlediği filtrelere uyan ürünlerde fiyat düşüşü olduğunda Discord'a bildirim gönderen bir sistem.

Örnek: "sadece 5060 içeren sistemleri takip et, fiyat %5 düşerse haber ver."

Bu sitelerin hazır API'si yok. Veri, sitenin kendi isteklerinden ya da sayfa içeriğinden alınır.

## Genel yaklaşım

- Zamanlama, veri çekme, karşılaştırma ve bildirim n8n workflow'ları ile yapılır.
- Mümkünse önce sitenin kendi veri kaynağı (JSON) tercih edilir, sayfa ayrıştırma ikinci seçenek, tam tarayıcı otomasyonu son çaredir.
- Takip filtreleri Discord üzerinden dinamik olarak yönetilebilmelidir (ekle, sil, listele, eşik değiştir).
- Fiyat geçmişi kalıcı olarak saklanır ki değişim tespit edilebilsin.

## Takip filtreleri

Her takip şunları içerebilir: dahil edilecek kelimeler, hariç tutulacak kelimeler, fiyat aralığı, düşüş eşiği ve kaynak site.

Önemli: "5060" ile "5060 Ti" farklı ürünlerdir. Eşleştirme bunu ayırabilmelidir.

## Veri çekme ilkeleri

- Sayfa yapısı veya alan adlarını tahmin etme, gerçek yanıtı inceleyip doğrula. Doğrulayamadıysan bunu belirt.
- Sitelere saygılı davran: seyrek tarama, istekler arasında bekleme, kullanım şartlarına ve robots.txt'ye uyum.
- Bot koruması ile karşılaşırsan atlatmaya çalışma. Dur, durumu bildir, alternatif öner.
- Yapı değişir ve parse bozulabilir. Böyle durumlarda sessiz kalma, hata bildirimi gönder.

## Bildirimler

- Mesaj: ürün adı, eski ve yeni fiyat, düşüş yüzdesi, site ve link.
- Aynı düşüş için tekrar bildirim atma.
- Stokta olmayan ürünü indirim sayma.
- Çok sayıda eşleşme varsa tek mesajda grupla, spam yapma.

## n8n ile çalışma kuralları

- Önce test ortamında dene. Canlı workflow'lara dokunmadan önce sor.
- Oluşturduğun workflow'u aktif etme, bunu kullanıcı yapar.
- Anlaşılır node isimleri kullan, hata durumları için ayrı bir yol bulunsun.
- Workflow büyürse alt workflow'lara böl.
- Başlamadan kısa bir plan yaz, bitirince ne yaptığını özetle.

## Güvenlik

- Token, webhook adresi, API anahtarı gibi sırlar koda, workflow'a ya da loglara yazılmaz. Güvenli credential alanları kullanılır.
- Kullanıcıdan gelen girdiyi (Discord'dan girilen filtreler vb.) güvenilmez kabul et, sınırla ve temizle.
- Üçüncü taraf paket ve skill'leri kurmadan önce içeriğini incele.

## Bitti sayılması için

1. Gerçek bir örnek üzerinde veri çekme çalıştığı gösterildi.
2. Filtreler en az bir olumlu ve bir olumsuz örnekle denendi ("5060" eşleşir, "5060 Ti" eşleşmez).
3. Hata durumları bildirim üretiyor.
4. Hiçbir dosyada gizli bilgi yok.
5. Yapılanlar ve doğrulanamayanlar kısaca raporlandı.

## Yapılmayacaklar

- Bot korumasını aşmaya çalışmak veya siteyi yormak.
- Doğrulamadan varsayım yapmak.
- Canlı workflow'u izinsiz değiştirmek, silmek ya da aktif etmek.
- Kullanıcının filtre ve fiyat geçmişini sormadan silmek.

## Alınan kararlar

- **Depolama:** n8n Data Table. Fiyat geçmişi ve kullanıcı filtreleri burada tutulur.
- **Çalışma ortamı:** Kullanıcının yerel makinesi. Makine kapalıyken tarama yapılmaz, bu bilinen bir sınırdır. Kaçan taramalar sonradan telafi edilmeye çalışılmaz, bir sonraki taramadan devam edilir.
- **Discord:** Slash komutlu bot. Filtreler komutlarla dinamik yönetilir (ekle, sil, listele, eşik değiştir). Bildirimler de aynı bot üzerinden gider.
- **Tarama sıklığı:** Saatte bir. Daha sık tarama yapma.

## Başlamadan önce kullanıcıdan istenecekler

Aşağıdaki bilgiler henüz belli değil. Agent bunları **varsaymaz ve uydurmaz**, işe başlamadan önce kullanıcıya sorar:

- **Site linkleri:** Takip edilecek sayfa/kategori linkleri (incehesap ve gaming gen tr için). Kullanıcı link vermeden veri çekme kısmına geçilmez.
- **Discord:** Bildirimlerin gideceği sunucu ve kanal.

Kullanıcı yanıt verene kadar bu bilgilere bağlı olmayan işler (workflow iskeleti, filtre ve veri modeli gibi) hazırlanabilir, ama linklere bağlı hiçbir şey tahmin edilerek yazılmaz.