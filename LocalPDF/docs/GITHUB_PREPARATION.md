# Yeni depo kaynak hazırlığı

Kaynak klasörü .github/, docs/, public/, scripts/, src/ ve tests/ dizinlerini korur. Uzun teknik belgeler docs/ altındadır; ana README'ler, lisans ve katkı/güvenlik belgeleri köktedir. PDF motoru ve worker'ının çalışan src/pdf/ yerleşimi korunmuştur.

Ekran görüntüleri docs/screenshots/ altındadır ve yalnızca sentetik belgeler içerir. Üretim çıktısı, node_modules, .git, test kayıtları, kişisel belgeler ve önceki GitHub inceleme kopyası bu pakete dahil değildir.

Workflow eylemleri commit SHA'larıyla sabittir; kullanıcı belgeleri kaynak depoya eklenmez. Kaynak denetimi ZIP'ten çıkarılmış, henüz git init yapılmamış klasörde de çalışır. Ayrıntılar için [yükleme rehberi](UPLOAD.md), [doğrulama](VALIDATION.md) ve [güvenlik politikası](../SECURITY.md).

Bilinen fflate 0.8.2 uyarısı giderilmiş sayılmaz; 0.8.3 güncellemesi ve güncel audit ayrı bir bakım adımıdır. GitHub Actions henüz yeni depoda çalışmadı. Yerel kaynak hazırlığı otomatik GitHub veya Cloudflare yayını yapmaz.
