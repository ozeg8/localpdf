# Yerel doğrulama kaydı

Özgün çalışan projede 33 birim/PDF/politika testi ve 30 masaüstü/mobil Chromium testi geçti. On PDF aracı, gerçek indirilen çıktılar, hatalı/şifreli/boş/büyük girdiler ve offline işleme sınandı. Yeni kaynak kopyasında PDF motoru, worker konumu ve UI işlevleri korundu. Teknik belgeler docs/ altına alındı; Tailwind taraması yalnızca src/ ile sınırlandı.

## Yeni kaynak kopyasının gerçekten çalıştırılan kontrolleri

- npm test: **33/33 geçti**.
- npm run build: **başarılı**, TypeScript kontrolü ve lisans raporu dahil; 214 uygulama önbellek varlığı üretildi.
- npm run check:repository: **0 bulgu**, 8 PNG, 82 kaynak dosyası. Git geçmişi olmayan ZIP kopyasında üst/başka bir Git deposunun dosyaları taranmıyor.
- Taşınan belgelerin yerel Markdown link hedefleri kontrol edildi; kopuk hedef yok.
- Ayrı temiz üretim önizlemesinde Chromium: HTTP 200, 10 araç kartı, mobil yatay taşma yok, sayfa hatası yok.
- Gerçek offline yenileme sonrası örnek PDF döndürülüp indirildi; indirilen PDF bağımsız parser ile açıldı, 2 sayfa ve 90 derece dönüş doğrulandı.
- Bu tarayıcı kontrolünde beklenmedik dış istek, POST/PUT veya istek gövdesi görülmedi. Tüm cihaz ağ trafiğinin denetlendiği iddia edilmez.

Kontroller aynı lock ile eşleşen mevcut yerel bağımlılıklar kullanılarak ayrı hazırlık alanında çalıştırıldı. Yeni ağdan temiz npm ci kurulumu bu oturumda yapılmadı. Önceki 30 senaryolu tam browser suite bu yeni kopyada yeniden çalıştırılmış sayılmaz; yeni kopyada yukarıdaki hedefli tarayıcı kontrolü yapıldı. Son paylaşım klasörüne node_modules, dist, .git, geçici test veya inceleme verileri kopyalanmadı.

Firefox/WebKit runtime'ları yerel ortamda eksik olduğundan bu motorlar doğrulanmadı. PWA manifest/kurulabilirlik ve offline Chromium testleri geçti; gerçek işletim sistemi kurulumu ve iOS UI testi yapılmadı. Kapsamlı WCAG ve zararlı PDF korpusu denetimi yoktur.

Kurulu fflate 0.8.2 için bilinen ZIP açma uyarısı SECURITY.md içinde açıklanır; uygulama ZIP girdisi kabul etmez. Canlı audit bu çalışma bağlamında tamamlanamadı. Temiz audit veya her tarayıcıda üretim onayı iddia edilmez.
