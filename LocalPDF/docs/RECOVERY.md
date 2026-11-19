# Yerel ortamı kurtarma — Windows, yönetici izni gerektirmeden

**Güncelleme:** Normal PowerShell’de `npm.cmd install` başarılı oldu (61 paket eklendi, 68 audit edildi). Lock ve bağımlılıklar artık mevcut. Üretim derlemesi ve Chromium PDF/offline testleri çalışıyor; yerel önizleme `http://127.0.0.1:4173/`. Aşağıdaki ilk teşhis kurulum öncesi kayıttır; güncel sonuçlar VALIDATION.md içindedir.

## Bu oturumda belirlenen hata

Node `25.9.0`, npm `11.12.1`. Proje ve npm cache klasörlerinde geçici dosya oluşturma/okuma/kaldırma başarılı. Doğrudan Node HTTPS isteği ve `npm.cmd ping`, registry bağlantısında `EACCES` döndürdü. İşlem hesabı `CodexSandboxOffline`; bu Codex oturumunun ağı kısıtlı. Yerel HTTP testi `200`, Chromium headless başlatma testi başarılı.

Bu kanıt npm cache veya proje ACL hatasını desteklemiyor. npm’in yönetici/antivirüs önerisi genel hata metnidir; bu teşhise dayanarak uygulanmadı. Normal Windows terminalindeki registry erişimi henüz karşılaştırılmadığından makine genelinde bir ağ sorununun ayrıca bulunmadığı ileri sürülmez.

Sistem PATH’i, execution policy, Windows Defender, güvenlik duvarı, TLS doğrulaması veya ACL değiştirilmedi. Cache temizlenmedi; lock veya mevcut bağımlılıklar silinmedi. `npm.ps1` yürütme kısıtı için `npm.cmd` kullanılır; güvenlik politikasını değiştirmek gerekmez.

## Normal PowerShell’de LocalPDF kurulumu ve doğrulama

Codex komut alanı dışındaki normal Windows PowerShell penceresine yapıştır. Yönetici olarak açma. Her adım hata verirse durur; önceki hata düzeltilmeden sonraki adım başarılı sayılmaz.

```powershell
# Bu terminali LocalPDF checkout'unun kökünde aç.

node --version
npm.cmd --version
npm.cmd run diagnose
if ($LASTEXITCODE -ne 0) { throw 'Registry veya klasör erişimi başarısız. Yukarıdaki teşhis sonucunu incele.' }

npm.cmd install
if ($LASTEXITCODE -ne 0) { throw 'Bağımlılık kurulamadı; son npm hata satırlarını paylaş.' }

npx.cmd --no-install playwright install chromium firefox webkit
if ($LASTEXITCODE -ne 0) { throw 'Tarayıcı hazırlığı başarısız.' }

npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw 'Yerel doğrulama başarısız. İlk hata düzeltilmeden sürümü kullanıma hazır sayma.' }

npm.cmd audit --audit-level=high
if ($LASTEXITCODE -ne 0) { throw 'Bağımlılık taramasında incelenmesi gereken sonuç var.' }

npm.cmd run preview
```

Üretim önizleme adresi `http://127.0.0.1:4173`. PWA testi için `dev` yerine tamamlanmış üretim derlemesinin `preview` komutunu kullan. Geliştirme için `npm.cmd run dev` (`http://127.0.0.1:5173`). Sunucuyu terminalde `Ctrl+C` ile durdurabilirsin.

`npm install` mevcut lock dosyasını veya paketleri önceden silmeden çalışır. İlk kurulumda lock yoksa oluşturur. Bir paket için `ETARGET` çıkarsa sürümün varlığı resmi npm kaynağından kontrol edilmeli; otomatik olarak tüm paketleri `latest` yapma. `audit fix --force` çalıştırma.

Normal terminalde de `registry.ok=false` olursa son hata kodunu paylaş. Cache erişimi başarılıyken Windows izinlerini topluca değiştirme; proxy/VPN/kurumsal ağ gibi makine dışı koşullar ayrıca teşhis edilmelidir. TLS doğrulamasını kapatma.

## REA: ayrı, taşınabilir Node ile hazırlık

Resmi [REA package.json](https://raw.githubusercontent.com/morluto/rea/main/package.json) ve mevcut yerel `6.9.0` aynı gereksinimi bildiriyor: `^22.23.4 || ^24.22.1 || >=26.12.1`; npm pin’i `11.16.0`. Node 25 kabul edilmiyor. Uyumlu yerel Node bulunamadı; ağ kısıtı nedeniyle bu oturumda indirilemedi. Aşağıdaki komutlar **burada çalıştırılmadı**.

Bu blok resmi Node ZIP’ini yeni, kullanıcıya ait bir klasöre açar, yayımlanan SHA-256 ile doğrular ve yalnızca açık PowerShell penceresinin PATH’ini değiştirir. Sistem Node kurulumu korunur. Önce LocalPDF’nin temel doğrulamasını tamamlamak mümkündür; REA buna önkoşul değildir.

```powershell
$ErrorActionPreference = 'Stop'
$reaVersion = '24.22.1'
$reaArchiveName = "node-v$reaVersion-win-x64.zip"
$reaRuntimeRoot = Join-Path $env:LOCALAPPDATA ('LocalPDF\toolchains\rea-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $reaRuntimeRoot | Out-Null
$reaArchive = Join-Path $reaRuntimeRoot $reaArchiveName
Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$reaVersion/$reaArchiveName" -OutFile $reaArchive
$reaChecks = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$reaVersion/SHASUMS256.txt").Content
$reaHashLine = @($reaChecks -split '\r?\n' | Where-Object { $_ -match ('\s' + [regex]::Escape($reaArchiveName) + '$') })
if ($reaHashLine.Count -ne 1) { throw 'Resmi SHA-256 kaydı bulunamadı.' }
$reaExpectedHash = ($reaHashLine[0] -split '\s+')[0]
if ((Get-FileHash -LiteralPath $reaArchive -Algorithm SHA256).Hash -ne $reaExpectedHash) { throw 'Node ZIP SHA-256 eşleşmiyor.' }
Expand-Archive -LiteralPath $reaArchive -DestinationPath $reaRuntimeRoot
$reaNodeDirectory = Join-Path $reaRuntimeRoot "node-v$reaVersion-win-x64"
$env:Path = "$reaNodeDirectory;$env:Path"
node --version
if ($LASTEXITCODE -ne 0) { throw 'Taşınabilir Node başlatılamadı.' }

Set-Location -LiteralPath (Join-Path $env:USERPROFILE 'rea')
npx.cmd --yes npm@11.16.0 ci
if ($LASTEXITCODE -ne 0) { throw 'REA bağımlılık kurulumu başarısız.' }
npx.cmd --yes npm@11.16.0 run build:cached
if ($LASTEXITCODE -ne 0) { throw 'REA derlemesi başarısız.' }
node scripts/rea.mjs --version
if ($LASTEXITCODE -ne 0) { throw 'REA henüz çalışmıyor.' }
```

Bir ağ/404 hatasında blok durmalıdır. Çalışır REA elde edilse bile referans analizi yapılmış sayılmaz: ayrı bir CDP hedefinde yalnızca kamuya açık arayüzler gözlenmeli; kullanıcı belgeleri referans servise gönderilmemelidir. Henüz yeni REA bulgusu veya Evidence kaydı yoktur.
