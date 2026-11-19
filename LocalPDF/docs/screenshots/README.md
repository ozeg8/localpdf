# LocalPDF — paylaşılabilir uygulama görüntüleri

Bu görseller gerçek yerel üretim önizlemesinden Playwright ile alınmıştır. Maket değildir. Yalnızca kodla üretilmiş sentetik örnek PDF’ler kullanılır; kişisel belge, hesap bilgisi veya masaüstü görüntüsü içermez.

| Dosya | İçerik |
| --- | --- |
| [01-home-desktop.png](01-home-desktop.png) | Türkçe ana ekran, masaüstü |
| [02-home-mobile.png](02-home-mobile.png) | 390 × 844 mobil görünüm |
| [03-home-dark.png](03-home-dark.png) | Koyu tema |
| [04-merge-workspace.png](04-merge-workspace.png) | İki PDF ile birleştirme çalışma alanı |
| [05-organize-pages.png](05-organize-pages.png) | Üç gerçek PDF sayfasının önizlemeleri |
| [06-download-ready.png](06-download-ready.png) | Tamamlanmış birleştirme ve indirme sonucu |
| [07-privacy-verification.png](07-privacy-verification.png) | Gizlilik doğrulama ekranı ve offline hazırlık durumu |
| [08-home-english.png](08-home-english.png) | İngilizce ana ekran |

Görüntülerin lisansı proje ile aynıdır: [MIT](../../LICENSE). Kaynak ve ekran görüntüleri LocalPDF’ye aittir; referans sitenin marka varlıkları kullanılmaz. `capture-info.json`, görüntülerin oluşturulma zamanı, viewport ve kapsamını kaydeder. Görüntüler tek başına güvenlik testi kanıtı değildir; test sonuçları [VALIDATION.md](../VALIDATION.md) dosyasındadır.

Tekrar üretmek için önce `npm run build`, bir terminalde `npm run preview`, diğer terminalde `npm run screenshots` çalıştır. İşlem yeni ve ayrı bir tarayıcı bağlamı kullanır; açık kişisel tarayıcı sekmelerine veya belgelerine erişmez.
