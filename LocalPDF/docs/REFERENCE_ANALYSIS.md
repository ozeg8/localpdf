# Referans analizi — 2026-11-19

Recovery güncellemesi: resmi [upstream package.json](https://raw.githubusercontent.com/morluto/rea/main/package.json) ile yerel `6.9.0` Node aralıkları tekrar karşılaştırıldı ve eşleşti. CLI Node 25’i tekrar reddetti. Uyumlu yerel Node, bağımlılıklar ve derleme yok; registry erişimi ağ kısıtlı oturumda `EACCES`. Yeni REA gözlemi veya doğrulanmış arayüz karşılaştırması yapılmadı. Taşınabilir Node ve kesin normal-terminal adımları: [RECOVERY.md](RECOVERY.md).

## Yöntem ve kanıt sınırı

Kullanıcının yerel REA checkout’u; origin `https://github.com/morluto/rea.git`. İnceleme anındaki commit `4502bd44b`, paket sürümü `6.9.0`. `node scripts/rea.mjs --version` başarısız: Node `25.9.0` desteklenmiyor. `node_modules` ve `dist` yok. Repo `^22.23.4 || ^24.22.1 || >=26.12.1` istiyor. Önceki `npm ci` denemesi `EBADENGINE` döndürdü; bu oturumdaki npm erişimi ayrıca `EACCES` ile reddedildi.

**REA ile web gözlemi yapılamadı; REA Evidence kaydı veya ekran görüntüsü üretilmedi.** Repo dokümanındaki `inspect-web-page`, `observe-web-session`, `capture-web-screenshot` yüzeyleri yalnızca kaynak incelemesiyle tanındı; kullanılmadı. Çalışır REA ve açıkça ayrılmış kullanıcıya ait CDP tarayıcı hedefi sağlandığında analiz tamamlanabilir. Mevcut kişisel tarayıcı oturumlarına bağlanılmadı.

Aşağıdaki gözlemler web okuma aracının eriştiği kamuya açık sayfa metnine dayanır. Dinamik arayüzün işlendiği, düğmelerin çalıştığı veya gizli alanların görünür olduğu sonucuna varılmaz. Ekran görüntüsü/piksel analizi değildir. Giriş, ödeme veya erişim engeli aşılmadı. Referansa belge gönderilmedi.

## Doğrudan gözlemler

| Alan | Sayfa metninde gözlenen | Kaynak |
| --- | --- | --- |
| Ana ekran | Araç envanteri ve kategori etiketleri; birleştir/böl/sıkıştır erken listeleniyor | [Ana sayfa](https://www.ilovepdf.com/tr) |
| Kategoriler | Düzenleme, iyileştirme, PDF’e/PDF’den dönüşüm ve güvenlik grupları | [Ana sayfa](https://www.ilovepdf.com/tr) |
| Birleştirme | Dosya seçme, sürükle-bırak metni ve dosya sırası değiştirme yönergesi | [Birleştir](https://www.ilovepdf.com/tr/pdf-birlestirme) |
| Bölme | Aralık ve sayfa seçimi; ayrı sayfa çıktısı veya tek dosyada toplama seçenek metinleri | [Böl](https://www.ilovepdf.com/tr/pdf-bolme) |
| Sıkıştırma | Üç düzey ve kalite/boyut ilişkisini açıklayan seçenekler | [Sıkıştır](https://www.ilovepdf.com/tr/pdf-kucultme) |
| Görsel → PDF | Yön, sayfa boyutu ve kenar boşluğu seçenekleri | [JPG → PDF](https://www.ilovepdf.com/tr/jpg-pdf-cevirme) |
| PDF → Görsel | Sayfayı görüntüleme ve gömülü görüntüleri ayıklama ayrı seçenekler olarak tanımlanıyor | [PDF → JPG](https://www.ilovepdf.com/tr/pdf-jpg-cevirme) |

## Doğrulanamayanlar

- Ana sayfanın gerçek sütun sayısı, boyutları, renkleri, kart aralıkları veya görsel hiyerarşisi.
- Mobil/masaüstü responsive kırılımları, dokunma hedefleri, klavye ve ekran okuyucu davranışı.
- Dosya seçiminden sonra sayfa küçük resimleri, sürükleme ayrıntıları ve önizleme performansı.
- Tamamlanan işlem sonrası indirme ekranı, tekrar işleme, hata veya iptal akışı.
- Gerçek dönüşüm kalitesi, işlem süresi, sıkıştırma oranı veya ağ/dosya saklama davranışı.
- Bir seçenek metninin okunması, ücretsiz veya erişilebilir olduğunun kanıtı değildir. Bölme sayfasında ücretli seçenek işareti de vardı; bu alan denenmedi.

## LocalPDF’ye uyarlanan tasarım kararları (tasarım çıkarımı)

Araç seçimini dosya seçimiyle birleştir: büyük yerel giriş alanı, çok PDF için birleştirme önerisi, tek PDF için düzenleme önerileri, görseller için dönüşüm. Görünür durum akışı: seç → ayarla → işle → indir. Üç basit kategori, aynı sayfada çalışma alanı, erişilebilir sıralama düğmeleri, iptal ve tekrar deneme. Doğrulanmış referans davranışı oldukları iddia edilmeyen özgün ürün kararlarıdır.

İlk sürümde Office/OCR/AI dönüşümleri yok; cihazda güvenilir uygulanabilen işlemler seçildi. Referansın kaynak kodu, logosu, görsel varlıkları ve marka biçimi kopyalanmadı. Yerel arayüz, farklı renkler ve özgün kodla oluşturulmuş simgeler kullanır.

## REA ile tamamlanacak çalışma

Desteklenen Node ile bağımlılık ve derleme hazırlanmalı; ağ yetkisi olmadan bunları sağlanmış sayma. Ayrı tarayıcı hedefinde kamuya açık sayfalar masaüstü ve mobil genişliklerinde gözlenmeli. REA capture ID’leri ve sınırlamaları eklenmeli. İndirme ekranını doğrulamak belgeyi dış servise gönderecekse kullanıcı onayı alınmalı; onay yoksa alan doğrulanmamış kalmalı.
