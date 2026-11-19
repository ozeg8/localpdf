import { chromium } from 'playwright';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Captures only this app in a fresh, isolated browser context. No user documents.
const directory = new URL('../docs/screenshots/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const records = [];
async function demoPdf(label) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 40, y: 715, width: 515, height: 80, color: rgb(.14,.33,.9) });
    page.drawText('LOCALPDF DEMO', { x: 60, y: 753, size: 24, font, color: rgb(1,1,1) });
    page.drawText(label, { x: 40, y: 670, size: 20, font });
    page.drawText('A sample document, made on your device.', { x: 40, y: 630, size: 14, font });
    page.drawText('Synthetic content. No personal information.', { x: 40, y: 605, size: 14, font });
    for (let row = 0; row < 6; row++) page.drawRectangle({ x: 40, y: 550 - row * 32, width: row % 2 ? 420 : 515, height: 10, color: rgb(.9,.93,.97) });
    page.drawText(`Page ${i + 1} / 3`, { x: 40, y: 40, size: 12, font });
  }
  return Buffer.from(await doc.save());
}
try {
  const context = await browser.newContext({ locale: 'tr-TR', colorScheme: 'light', viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const response = await page.goto('http://127.0.0.1:4173/');
  if (!response?.ok()) throw new Error('Start the built application with npm run preview first.');
  const capture = async (file, description, fullPage = false) => {
    await page.screenshot({ path: fileURLToPath(new URL(file, directory)), fullPage, animations: 'disabled' });
    records.push({ file, description, viewport: page.viewportSize() });
  };
  await capture('01-home-desktop.png', 'Türkçe ana ekran / Turkish desktop home');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('02-home-mobile.png', 'Mobil ana ekran / Mobile viewport');
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole('button', { name: 'Koyu tema', exact: true }).click();
  await capture('03-home-dark.png', 'Koyu tema / Dark theme');
  await page.getByRole('button', { name: 'Açık tema', exact: true }).click();
  const first = { name: 'localpdf-demo-a.pdf', mimeType: 'application/pdf', buffer: await demoPdf('Project notes') };
  const second = { name: 'localpdf-demo-b.pdf', mimeType: 'application/pdf', buffer: await demoPdf('Meeting notes') };
  await page.getByTestId('file-input').setInputFiles([first, second]);
  await page.getByTestId('process').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[data-testid="process"]')?.hasAttribute('disabled'));
  await capture('04-merge-workspace.png', 'İki gerçek örnek PDF ile birleştirme / Merge workspace');
  await page.getByTestId('process').click();
  await page.getByTestId('download').waitFor();
  await capture('06-download-ready.png', 'Gerçek birleştirme işlemi tamamlandı / Real merge result');
  await page.getByRole('button', { name: 'Çalışma alanını temizle', exact: true }).click();
  await page.getByTestId('file-input').setInputFiles(first);
  await page.locator('.tool-pills').getByRole('button', { name: 'Sayfaları sırala', exact: true }).click();
  await page.waitForFunction(() => {
    const canvases = [...document.querySelectorAll('.page-grid canvas')];
    return canvases.length === 3 && canvases.every(canvas => {
      if (!canvas.width || !canvas.height) return false;
      const data = canvas.getContext('2d').getImageData(Math.round(canvas.width*.15), Math.round(canvas.height*.12), 1, 1).data;
      return data[2] > data[0] + 40;
    });
  });
  await capture('05-organize-pages.png', 'PDF.js ile çizilmiş gerçek sayfalar / Rendered page previews');
  await page.getByRole('button', { name: 'Gizliliği doğrula', exact: true }).first().click();
  await page.getByText('Çevrim dışı kullanıma hazır', { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture('07-privacy-verification.png', 'Gizlilik doğrulama ve gerçek offline hazırlık durumu / Privacy verification', true);
  await page.getByRole('button', { name: 'Araçlara dön', exact: true }).click();
  await page.getByRole('button', { name: 'Çalışma alanını temizle', exact: true }).click();
  await page.getByRole('button', { name: 'Dili değiştir', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture('08-home-english.png', 'İngilizce arayüz / English home');
  await writeFile(new URL('capture-info.json', directory), JSON.stringify({ capturedAt: new Date().toISOString(), source: 'LocalPDF local production preview', fixtures: 'Generated synthetic PDFs only; no user documents', images: records.sort((a,b)=>a.file.localeCompare(b.file)) }, null, 2) + '\n');
  console.log(`Saved ${records.length} real application screenshots to docs/screenshots.`);
} finally { await browser.close(); }
