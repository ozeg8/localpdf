# LocalPDF'yi aç

1. ZIP dosyasına sağ tıkla ve **Tümünü ayıkla** seçeneğini kullan.
2. Çıkan LocalPDF klasöründe **BASLAT.cmd** dosyasına çift tıkla.
3. Tarayıcı otomatik açılır. Sunucu penceresini kullanım boyunca açık tut.

Hazır pakette npm kurulumu veya derleme gerekmez. Bilgisayarda Node.js 22.18+ bulunmalıdır. Sunucu yalnızca bu cihazda çalışır. 4173 portu doluysa bir sonraki boş port kullanılır.

Kaynak kodu değiştirdikten sonra `npm ci` ve `npm run build` çalıştır.

# GitHub'a aktar

GitHub-Kaynak.zip yalnızca kaynak kodunu içerir. Arşivi çıkardıktan sonra GitHub Desktop ile klasörü depo olarak açarak klasör yapısını koru. `package.json` ve `README.md` depo kökünde, `App.tsx` ise `src` klasöründe olmalıdır. ZIP dosyasını tek başına depoya yüklemek uygulamayı kurmaz.

Mevcut depodaki köke taşınmış dosyaları bu doğru kaynak ağacıyla değiştir. Hazır paketin `dist` ve `node_modules` klasörleri Git'e eklenmez; `.gitignore` bunları dışlar. GitHub'a kaynak yüklemek tek başına canlı web sitesi yayını oluşturmaz.
