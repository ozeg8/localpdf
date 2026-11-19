# Yeni GitHub deposuna yükleme

Bu klasörün kökünde package.json, README.md ve src/ birlikte bulunur. .github/, docs/, public/, scripts/, src/ ve tests/ klasörleri olduğu gibi korunmalıdır.

## Tarayıcıyla

1. GitHub'da boş bir depo oluştur; README veya lisans ekletme, bu dosyalar zaten mevcut.
2. Deponun Upload files sayfasını aç.
3. Windows Dosya Gezgini'nde package.json dosyasının bulunduğu bu klasörü aç.
4. İçindeki dosyaları VE klasörleri birlikte seçip GitHub'ın sürükle-bırak alanına sürükle. Yalnızca dosya seç penceresinde Ctrl+A kullanmak alt klasörleri aktarmayabilir.
5. Listede src/App.tsx, .github/workflows/ci.yml ve docs/screenshots/01-home-desktop.png yollarını görmeden commit yapma.
6. Kaydet. README.md ve package.json deponun kökünde görünmeli; PNG'ler docs/screenshots içinde olmalı.

Kökte App.tsx, ci.yml, download veya README (3).md görürsen klasörler düzleşmiştir; o yüklemeyi kaydetme. ZIP dosyasını tek bir dosya olarak yüklemek kaynak ağacını oluşturmaz. Git ile yükleme klasörleri doğal olarak korur.

Mevcut eski deponun temizlendiği veya yeni deponun oluşturulduğu iddia edilmez. Buradan otomatik push yapılmaz. GitHub Desktop veya Git kullanıyorsan bu klasörü yerel repo olarak ekleyip kendi hesabınla yeni depoya yayımlayabilirsin.
