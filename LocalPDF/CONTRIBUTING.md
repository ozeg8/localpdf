# Katkıda bulunma

Ürün ilkesi: **Minimum clicks. Maximum simplicity.** Değişiklikler tarayıcıda yerel işlemeyi, ücretsiz statik dağıtımı ve doğrulanabilir gizliliği korumalıdır.

1. Değişikliği kısa ve somut açıkla; kullanıcı verisi, gerçek PDF veya gizli ortam dosyası ekleme.
2. Yeni aracın boş UI yerine gerçek işlem davranışını ve gerçek çıktı testini ekle.
3. Yeni bağımlılığın lisans, bakım ve güvenlik durumunu incele; lock ve NOTICE raporunu güncelle.
4. `npm run check` ve `npm audit --audit-level=high` çalıştır. Çalıştırılmayan testleri açıkça yaz.
5. TR/EN metinlerini birlikte güncelle. Klavye, görünür odak, dar ekran, tema ve reduced-motion davranışını kontrol et.

Belge işleme yoluna uzak API, analitik, telemetri veya otomatik kalıcı belge saklama ekleme. Güvenlik hatalarında [SECURITY.md](SECURITY.md) yönergesini izle. PWA testleri üretim derlemesiyle çalıştırılmalıdır. Yeni test fixture’ları kodla oluşturulmuş sentetik belgeler olmalıdır.

Henüz public repo/maintainer rapor kanalı yok; contribution ve güvenlik bağlantıları yayın sırasında gerçek repo adresiyle güncellenecek.
