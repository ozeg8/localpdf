# Bağımlılık ve lisans değerlendirmesi

İnceleme: 2026-11-19. Normal Windows terminalinde kurulum tamamlandı; gerçek lock dosyası korunuyor. Kurulu 67 paket beyanı ve lisans metni raporlandı. Metadata kontrolü bağımsız hukuki denetim değildir. Canlı npm audit Codex ağında engelli; kurulumun bildirdiği açık uyarı aşağıdadır.

| Doğrudan bağımlılık | Lisans | Seçim / bakım değerlendirmesi |
| --- | --- | --- |
| React / React DOM 19.3.1 | MIT | UI; paket metadatası resmi React reposunu gösteriyor. Sunucu bileşeni veya SSR kullanılmaz. [React](https://react.dev/) |
| pdf-lib 1.17.1 | MIT | Birleştirme, sayfa kopyalama, döndürme, metin/görsel ekleme. Yerleşik, saf JS. [Upstream](https://github.com/Hopding/pdf-lib), [sürümler](https://github.com/Hopding/pdf-lib/releases). Seyrek yayın/uzun sürüm yaşı bakım riskidir; aktif güvenlik bakım garantisi verilmez. |
| pdfjs-dist 6.5.438 | Apache-2.0 | Mozilla PDF.js görüntüleme ve decoder worker’ı. [Resmi başlangıç](https://mozilla.github.io/pdf.js/getting_started/), [paket metadatası](https://registry.npmjs.org/pdfjs-dist/latest). Sürüm metadata/rehberden doğrulandı. Güvenlik güncellemeleri izlenmeli. |
| fflate 0.8.2 | MIT | Çoklu çıktı için küçük ZIP kütüphanesi; worker içinde kullanılır. [Upstream](https://github.com/101arrowz/fflate). Kurulu sürüm, bütünlük ve son sürüm karşılaştırması kurulum sonrası doğrulanacak. |
| Vite 8.3.8 | MIT | Statik üretim derlemesi. [Resmi doküman](https://vite.dev/guide/), [metadata](https://registry.npmjs.org/vite/latest). |
| Tailwind / @tailwindcss/vite 4.3.5 | MIT | Yerel CSS derlemesi; tarayıcıda Tailwind CDN yok. [Upstream](https://github.com/tailwindlabs/tailwindcss). Vite eklentisinin çözülmesi kurulum sonrası doğrulanacak. |
| TypeScript 6.0.3 | Apache-2.0 | Tip kontrolü; test ortamı ile uyumlu bilinen sürüm seçildi. [Upstream](https://github.com/microsoft/TypeScript). |
| Playwright Test 1.59.1 | Apache-2.0 | Gerçek tarayıcı, indirme, offline ve ağ kontrol testleri. [Upstream](https://github.com/microsoft/playwright). Bu ortamda yalnızca önbellekteki sürüm ayrıştırıcı olarak kullanılabildi. |
| @types/node, @types/react, @types/react-dom | MIT | Sadece geliştirme tipleri. [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped). Tam çözülmüş sürümleri lock dosyasıyla incelenecek. |

MIT ve Apache-2.0 bileşenler MIT lisanslı uygulamada ilgili telif, lisans ve NOTICE yükümlülükleri korunarak kullanılabilir; uygulamanın MIT lisansı üçüncü taraf kodun lisansını değiştirmez. Bu genel uyumluluk değerlendirmesi, tüm çözülmüş bağımlılıkların denetlendiği anlamına gelmez.

`npm run licenses` kurulu paket ağacında izin verilen lisans listesi dışında kalan veya lisansı belirsiz paketlerde durur. Lisans metinlerini `THIRD_PARTY_NOTICES.json` dosyasına toplar. Üretim derlemesi bu dosyayı dağıtıma dahil eder; PDF.js alt varlık lisansları da kopyalanır. Paket metadata beyanının doğruluğu veya her gömülü bileşenin eksiksizliği otomatik olarak ispatlanmaz; üretilen rapor ve PDF.js dağıtım lisansları insan tarafından gözden geçirilmelidir.

Kurulumda `lightningcss` ve platform paketi `MPL-2.0` beyan etti; lock dosyasında ikisi de yalnızca geliştirme bağımlılığıdır. Değiştirilmeden CSS derlemek için kullanılır, tarayıcıya MPL kitaplık kodu gönderilmez. Kontrol, MPL paketi runtime bağımlılığı olursa yeniden inceleme için durur. [Mozilla MPL açıklaması](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). `pako@1.0.11` birleşik `(MIT AND Zlib)` beyan eder; kök LICENSE yanında `lib/zlib/README` içindeki alt bileşen lisansı da dağıtım raporuna dahil edildi.

Bilinen açık: `fflate@0.8.2`, [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98). Yama `0.8.3`; yalnızca bu paketi `--save-exact` ile yükseltme adımı kullanıcıya verildi. Uygulamada etkilenen ZIP açma girdi yolu yoktur; çıktı ZIP oluşturma vardır. Uyarı güncelleme ve yeniden test yapılmadan kapatılmaz.

Yayın için güncel audit, kalan tarayıcı testleri ve lisans/NOTICE incelemesi tamamlanmalı. Dependabot haftalık kontrole hazırlandı. “Zafiyetsiz” veya “tam güvenli” iddiası yapılmaz.
