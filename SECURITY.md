# Güvenlik politikası

## Durum

0.1 geliştirme sürümünün üretim derlemesi, gerçek PDF işlemleri ve offline akışı masaüstü/mobil Chromium’da sınandı. Sonuçlar docs/VALIDATION.md içindedir. Bağımsız güvenlik denetimi veya sertifikası yoktur; bütün tarayıcı ve belge çeşitleri için güvenlik/doğruluk garantisi verilmez.

## Açık bağımlılık uyarısı

Kurulum `fflate@0.8.2` için orta seviye [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) uyarısı verdi. Düzeltilen sürüm `0.8.3`. Açık, bozuk ZIP64 arşivlerini `unzipSync` ile açma yolundadır. Uygulama yalnızca `zipSync` ile çıktı oluşturur; ZIP girdisi kabul etmez. Testler yalnızca kendi oluşturdukları ZIP’leri açar. Bu inceleme paketteki açığın giderildiği anlamına gelmez; yükseltme ve yeniden test bekliyor. `audit fix --force` kullanılmadı. Canlı audit endpoint erişimi Codex’te başarısız; çevrim dışı audit sonucu temiz güncel tarama sayılmadı.

## Tasarlanan korumalar

- Yerel işleme; yükleme endpoint’i, analitik, reklam veya üçüncü taraf çalışma script’i yok.
- CSP, `nosniff`, no-referrer, çerçevelemeyi ve gereksiz cihaz izinlerini engelleyen statik başlıklar.
- Format imzası, dosya boyutu/sayısı, sayfa ve piksel sınırları; parser hatalarının kullanıcıya metin olarak aktarımı.
- Sınırlı canvas önizleme; belge JavaScript’i/XFA/bağlantı/açıklama katmanı çalıştırılmaz.
- Ayrı işlem worker’ı, iptal ve zaman aşımı. Sonuç değiştiğinde Blob URL bırakılır.
- Belgeler kalıcı tarayıcı depolarına otomatik yazılmaz. İşletim sistemi/tarayıcı bellek yönetimi ve kullanıcının kendi indirmeleri bu kapsamın dışındadır.

Yeniden oluşturulan PDF’lerde sayfa etkileşimleri çıkarılır. Bu işlem kapsamlı bir PDF dezenfeksiyon ürünü değildir. Çıktıların bir başka okuyucuda açılmasının tüm riskleri giderilmez. PDF parser’ları karmaşıktır; piksel/boyut sınırları kesin bellek güvenliği garantisi vermez.

## Raporlama

Henüz public GitHub deposu veya private vulnerability reporting kanalı açılmadı. Bu sürüm için gerçek iletişim adresi uydurulmamıştır. Yayımdan önce depo sahibi GitHub Private vulnerability reporting’i etkinleştirmeli ve buraya doğrulanmış Security Advisories bağlantısını eklemelidir. Bu yapılana kadar sürüm yayıma hazır sayılmaz.

Açık bir issue’ya gerçek PDF, kişisel veri, token veya saldırı kurbanı bilgisi koyma. Güvenli raporda sentetik yeniden üretim, sürüm, tarayıcı, etki ve sorunun kaynağı yeterlidir. Maintainer erişim/yanıt SLA’sı henüz belirlenmemiştir.

## Yayın öncesi

Tam lock dosyası üretimi ve incelemesi, npm audit, üçüncü taraf lisans/NOTICE incelemesi, gerçek browser/offline testleri, secret taraması, gerçek raporlama kanalı ve kullanıcı onayı gerekir. CI’da yalnızca kaynak testlerinin geçmesi bu listenin tamamlandığı anlamına gelmez.
