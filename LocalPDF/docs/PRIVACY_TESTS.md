# Gizlilik doğrulaması: kapsam ve sınırlar

Son yerel çalıştırmada 30 birim/PDF/politika testi ve 30 masaüstü/mobil Chromium testi geçti. Gerçek HTTP istek/gövde ve sayfa WebSocket gözlemi, sentetik dosya işleme sırasında beklenmedik dış bağlantı veya yükleme bulmadı. Offline yenileme + döndürme + PNG/ZIP indirme ve gerçek worker/font/CMap/WASM cache envanteri doğrulandı. Firefox/WebKit binary’leri eksik olduğundan bu motorlar için doğrulama yok. Bu sonuç bir güvenlik sertifikası değildir. Ayrıntılar: VALIDATION.md.

## Bağımlılıksız testler

`npm run test:policy`, kaynakta uzak bağlantı/yükleme çağrısı olmamasını; belge kalıcılık API’lerinin bulunmamasını; preference anahtarlarını; CSP, manifest ve ikonları; SW’nin yalnızca bilinen GET varlıklarını önbelleğe almasını denetler. Service worker testi VM simülasyonudur: gerçek tarayıcı çevrim dışı testi değildir. Kaynak metni kontrolü geçişli bağımlılıkların davranışını kanıtlamaz.

Recovery testleri kontrollü bir Worker test double ile iptal, hata, aktarım hatası, sonuç ve zaman aşımında yaşam döngüsünü de kontrol eder. Boş ve 50 MiB üstü tampon sınırları çalıştırılır. Bunlar gerçek PDF işleme süresi/bellek ölçümü veya ağ trafiği testi değildir. Güncel sonuçlar VALIDATION.md içindedir.

## Gerçek PDF testleri

`tests/engine.test.ts` sentetik PDF’lerde çıktı sayfa sayısını, sırasını, boyutlarını, dönüş açılarını ve eklenen gerçek içerik operatörlerini okur. PNG gömme, bölünmüş PDF’ler, bozuk belge, özgün tamponun değişmemesi ve ölçülen sıkıştırma sonucu sınanır. Filigran ve numaralandırma yalnızca buton varlığıyla test edilmez.

## Gerçek tarayıcı testleri

`npm run build && npm run test:e2e` üretim dosyalarını Pages CSP başlıklarıyla sunar. Playwright testleri Chromium, mobil Chromium, Firefox ve WebKit projelerinde PDF araçlarını çalıştırır; indirilen dosyaları yeniden açar; görselleri çözer; ZIP’leri inceler. Context seviyesindeki HTTP istekleri ve sayfa WebSocket girişimleri izlenir. Yalnızca yerel uygulama varlıkları için GET/HEAD kabul edilir; istek gövdesi, beklenmedik yol veya dış origin başarısızlık üretir. Bu yerel test gözlemi, son kullanıcının tüm cihaz ağının denetlendiği iddiası değildir.

Chromium projesindeki PWA testi gerçek cache kurulumu tamamlandıktan sonra context’i offline yapar, sayfayı yeniler, örnek PDF döndürür ve PNG dışa aktarır. Cache Storage’da PDF/ZIP olmadığını ve localStorage’da yalnızca tercih anahtarlarını kontrol eder. Diğer motorlar işlem testlerini çalıştırır; onlarda çevrim dışı PWA regresyonu henüz yoktur. Test sunucusu yükleme rotası içermez ve GET/HEAD dışındaki metotları reddeder.

## Henüz kapsanmayanlar

Gerçek üretim origin’i ve Cloudflare panelindeki enjeksiyon/analitik ayarları; tarayıcı eklentileri; cihaz zararlıları; ele geçirilmiş bağımlılıklar; tüm olası PDF decoder açıkları; dev boyutlu saldırı korpusu; Safari/iOS yükleme UI’si; çoklu sekmede güncelleme yarışı; kapsamlı ekran okuyucu ve WCAG denetimi. Testler güvenlik sertifikası veya tüm dosyalarda doğruluk garantisi değildir. Test varlıkları sentetiktir, kullanıcı belgeleri test sunucusuna gönderilmez.

## Kullanıcının bağımsız denemesi

1. Üretim derlemesinde Gizliliği Doğrula bölümünden offline hazır durumunu bekle.
2. DevTools Network günlüğünü temizle, Preserve log’u aç. Sentetik örneği işle.
3. POST/PUT, WebSocket veya uygulama dışında origin olup olmadığını denetle. Statik font/decoder/worker GET’leri normaldir.
4. Offline seç, sayfayı yenile ve aynı işlemi tekrarla. İşlem ve indirme internet olmadan tamamlanmalı.
5. Application panelinde IndexedDB, localStorage ve Cache Storage’ı incele. Belgeler saklanmamalı; uygulama varlıkları ve tercihler görülebilir.

Çalıştırılan kontrollerin gerçek listesi [VALIDATION.md](VALIDATION.md) dosyasındadır. Bu dokümandaki test tasarımı, testlerin çalıştırılmış olduğu iddiası değildir.
