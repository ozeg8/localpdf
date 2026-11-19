# Cloudflare Pages — statik dağıtım

**Yayın yapılmadı.** GitHub veya Cloudflare hesabında değişiklik yapılmadı. Bu dosya, uygulama testleri tamamlanıp kullanıcı onay verdikten sonraki dağıtımı hazırlar. Kaynakta kayıt, ücretli API, backend, Functions veya depolama bağlayıcısı yoktur.

## Yayın öncesi kapılar

1. Ağ erişimi olan ortamda `npm install`; oluşan `package-lock.json` ve doğrudan/geçişli bağımlılık incelemesi.
2. `npm ci`, `npm run check` ve `npm audit --audit-level=high` başarılı olmalı.
3. Lisans/NOTICE raporu, gizli bilgi taraması, gerçek PDF test çıktıları ve test sınırları gözden geçirilmeli. Gerekirse tam depo geçmişi için ayrıca GitHub secret scanning kullanılmalı; mevcut tarama yalnızca çalışma ağacını kapsar.
4. GitHub güvenlik bildirim kanalı açılıp SECURITY.md güncellenmeli. Gerçek repo URL’si UI/README’ye eklenmeli.
5. GitHub Actions mevcut hazırlıkta resmi v7.0.0 release commit’lerine sabitlendi. Güncellemelerde SHA ve upstream release eşleşmesi yeniden kontrol edilmeli; Dependabot yapılandırması mevcut.
6. Kullanıcının public GitHub ve Cloudflare yayın onayı alınmalı.

## GitHub

Yerel repo `main` dalıyla başlatıldı. `.env`, belgeler, sonuçlar, tarayıcı test kayıtları ve `node_modules` ignore edilir. Gerçek kişisel veri içeren PDF ekleme. `git status --short`, `git diff --cached` ve secret taramasını kontrol etmeden push yapma. Sahip kimliği ve repo adresi bilinmediğinden remote/commit/push yapılmadı.

`.github/workflows/ci.yml`, PR ve push’larda tip/PDF/gizlilik/tarayıcı kontrollerini çalıştırır. Lock dosyası yoksa durur; sürüm çözümlemesini sessizce değiştirmez. `.github/workflows/security.yml` haftalık bağımlılık ve source secret kontrolünü hazırlar. `.github/dependabot.yml` güncelleme PR’larını yapılandırır. Bu dosyalar eklenmiş olsa da GitHub üzerinde henüz çalıştırılmadı.

## Cloudflare Pages Git entegrasyonu

Cloudflare panelinden **Workers & Pages → Create application → Pages → Import an existing Git repository** ile onaylanmış depoyu bağla. [Resmi React rehberi](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

| Ayar | Değer |
| --- | --- |
| Production branch | `main` |
| Root directory | Projenin kökü |
| Build command | `npm ci && npm run build` |
| Output directory | `dist` |
| Node sürümü | `.node-version` / `NODE_VERSION=24.22.1` |
| Backend / Functions | Yok |

Cloudflare Git entegrasyonu, bağlantı kurulduktan sonra push’larda otomatik derleme/dağıtım yapar. CI’nın geçmesi Pages dağıtımının otomatik önkoşulu değildir; `main` dalına required status checks ve PR koruması ekle. Public dağıtımı yapılandırmadan bu kontrollerin etkisini doğrula. Uygulama alan adı kökünden (`/`) sunulacak şekilde yapılandırılmıştır; GitHub Pages alt yolu için base ve SW yolları ayrıca uyarlanmalıdır.

Cloudflare Web Analytics, Zaraz veya üçüncü taraf script enjeksiyonlarını etkinleştirme. PDF.js font/worker/WASM dosyaları kendi `dist` içinde bulunur. `_headers` CSP ve diğer başlıkları sağlar; deployed origin üzerinde ayrıca kontrol edilmeli.

## Ücretsiz plan uygunluğu

[Cloudflare Pages sınırları](https://developers.cloudflare.com/pages/platform/limits/) bu incelemede Free için ayda 500 build, eşzamanlı tek build, 20 dakika build sınırı, site başına 20.000 dosya ve varlık başına 25 MiB belirtiyor. `finalize-build.mjs` dosya sayısı ve tek-varlık limitini denetler. Yerel ölçüm: 215 dağıtım dosyası, yaklaşık 6,1 MB toplam, en büyük varlık yaklaşık 1,27 MB. Güncel kesin sonuç VALIDATION.md içindedir. Belge boyutları hosting yükleme limitleriyle ilgili değildir; belgeler hosta gönderilmez. Plan koşulları yayın tarihinde yeniden kontrol edilmeli.

## Üretim kabulü

HTTPS, MIME tipleri ve CSP’yi kontrol et; dış kaynak istekleri olmadığını incele. İlk cache kurulumundan sonra interneti keserek soğuk yenileme + örnek işlem + indirmeyi dene. Açık belge varken güncellemenin otomatik etkinleşmediğini ve ikinci sekmeyle eski varlıkların korunmasını test et. Geri alma için Pages’in önceki başarılı dağıtımını kullan; üretimde çalışmayan sürümü çalışan sayma.
