import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import { encryptedFixture } from '../encrypted-fixture.ts';

async function synthetic() {
  const doc = await PDFDocument.create();
  for (const width of [200,300,400]) doc.addPage([width,500]);
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
function watchNetwork(context: BrowserContext, page: Page) {
  const violations: string[] = [];
  context.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol === 'blob:' || url.protocol === 'data:') return;
    const allowed = url.origin === 'http://127.0.0.1:4173' && (/^\/(?:$|index\.html$|manifest\.webmanifest$|icon\.svg$|favicon\.ico$|sw\.js$|assets\/|pdf-assets\/|icons\/|licenses\/)/.test(url.pathname));
    if (!allowed || !['GET','HEAD'].includes(request.method()) || request.postDataBuffer()?.length) violations.push(`${request.method()} ${url.origin}${url.pathname}`);
  });
  page.on('websocket', socket => violations.push(`WebSocket ${socket.url()}`));
  return violations;
}
async function download(page: Page) {
  const waiting = page.waitForEvent('download');
  await page.getByTestId('download').click();
  const file = await waiting;
  expect(await file.failure()).toBeNull();
  const location = await file.path();
  return { name:file.suggestedFilename(), bytes:new Uint8Array(await readFile(location!)) };
}

const cases = [
  { name:'PDF birleştir', count:6, many:true },
  { name:'PDF böl', count:2, range:'1,3' },
  { name:'PDF sıkıştır', count:3 },
  { name:'Sayfaları sırala', count:3, reorder:true },
  { name:'PDF döndür', count:3, rotate:true },
  { name:'Sayfaları sil', count:2, range:'2' },
  { name:'Filigran ekle', count:3, watermark:true },
  { name:'Sayfa numarala', count:3 },
];
for (const item of cases) test(`${item.name}: real output, no document egress`, async ({page,context}) => {
  const violations = watchNetwork(context,page);
  const errors: string[] = []; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  const input = {name:'synthetic.pdf',mimeType:'application/pdf',buffer:await synthetic()};
  await page.getByTestId('file-input').setInputFiles(item.many ? [input,{...input,name:'second.pdf'}] : input);
  await page.locator('.tool-pills').getByRole('button',{name:item.name,exact:true}).click();
  if (item.range) await page.getByTestId('page-range').fill(item.range);
  if (item.watermark) await page.getByTestId('watermark-text').fill('CONFIDENTIAL');
  if (item.reorder) await page.getByRole('button',{name:'Sona taşı: 1',exact:true}).click();
  await page.getByTestId('process').click();
  await expect(page.getByTestId('download')).toBeVisible();
  const output = await download(page);
  const doc = await PDFDocument.load(output.bytes);
  expect(doc.getPageCount()).toBe(item.count);
  if (item.rotate) expect(doc.getPage(0).getRotation().angle).toBe(90);
  if (item.reorder) expect(doc.getPages().map(p=>p.getWidth())).toEqual([300,200,400]);
  expect(violations).toEqual([]); expect(errors).toEqual([]);
});

test('PDF to PNG/JPG, split ZIP and lossy compression create real outputs', async ({page,context}) => {
  const violations = watchNetwork(context,page);
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:await synthetic()});
  for (const format of ['PNG','JPG']) {
    await page.locator('.tool-pills').getByRole('button',{name:'PDF’den görsele',exact:true}).click();
    await page.getByLabel('Görsel biçimi',{exact:true}).selectOption({label:format});
    await page.getByTestId('process').click();
    await expect(page.getByTestId('download')).toBeVisible();
    const output = await download(page);
    const files = Object.values(unzipSync(output.bytes));
    expect(files).toHaveLength(3);
    for (const bytes of files) {
      if (format === 'PNG') expect(Array.from(bytes.slice(0,8))).toEqual([137,80,78,71,13,10,26,10]);
      else expect(Array.from(bytes.slice(0,3))).toEqual([255,216,255]);
      const dimensions = await page.evaluate(async ({data,mime}) => {
        const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)],{type:mime}));
        const result = {width:bitmap.width,height:bitmap.height}; bitmap.close(); return result;
      }, {data:Array.from(bytes),mime:format === 'PNG' ? 'image/png' : 'image/jpeg'});
      expect(dimensions.width).toBeGreaterThan(0); expect(dimensions.height).toBeGreaterThan(0);
    }
  }
  await page.locator('.tool-pills').getByRole('button',{name:'PDF böl',exact:true}).click();
  await page.getByLabel('Her seçili sayfayı ayrı PDF yap (ZIP)',{exact:true}).check();
  await page.getByTestId('process').click(); await expect(page.getByTestId('download')).toBeVisible();
  const split = unzipSync((await download(page)).bytes);
  expect(Object.keys(split)).toHaveLength(3);
  for (const bytes of Object.values(split)) expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  await page.locator('.tool-pills').getByRole('button',{name:'PDF sıkıştır',exact:true}).click();
  await page.getByLabel('Görüntü olarak sıkıştır (kayıplı, en fazla 20 sayfa)',{exact:true}).check();
  await page.getByTestId('process').click(); await expect(page.getByTestId('download')).toBeVisible();
  const compressed = await download(page);
  expect((await PDFDocument.load(compressed.bytes)).getPageCount()).toBe(3);
  if (compressed.bytes.length >= (await synthetic()).length) await expect(page.getByText('Dosya küçülmedi. Özgün dosyanı koruduk.')).toBeVisible();
  expect(violations).toEqual([]);
});

test('lossy compression measurably reduces a synthetic scan and preserves page dimensions', async ({page,context}) => {
  const violations = watchNetwork(context,page);
  await page.goto('/');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');canvas.width=300;canvas.height=400;
    const context = canvas.getContext('2d')!;const image=context.createImageData(300,400);
    let seed=42;
    for(let i=0;i<image.data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;image.data[i+c]=seed>>>24;}image.data[i+3]=255;}
    context.putImageData(image,0,0);return canvas.toDataURL('image/png').split(',')[1];
  });
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(Buffer.from(png,'base64'));
  doc.addPage([300,400]).drawImage(image,{x:0,y:0,width:300,height:400});
  const original = await doc.save();
  await page.getByTestId('file-input').setInputFiles({name:'synthetic-scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(original)});
  await page.getByLabel('Görüntü olarak sıkıştır (kayıplı, en fazla 20 sayfa)',{exact:true}).check();
  await page.getByTestId('process').click();await expect(page.getByTestId('download')).toBeVisible();
  const output = await download(page);
  expect(output.bytes.length).toBeLessThan(original.length);
  const rebuilt = await PDFDocument.load(output.bytes);
  expect(rebuilt.getPage(0).getSize()).toEqual({width:300,height:400});
  await expect(page.getByText('Görüntüye dönüştürüldü; metin ve etkileşimler korunmaz.',{exact:true})).toBeVisible();
  expect(violations).toEqual([]);
});

test('PNG and JPG to PDF; signatures, not filenames, enforce validation', async ({page,context}) => {
  const violations = watchNetwork(context,page);
  await page.goto('/');
  const images = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width=40;canvas.height=30;
    const ctx = canvas.getContext('2d')!;ctx.fillStyle='#2454e6';ctx.fillRect(0,0,40,30);
    return ['image/png','image/jpeg'].map(type=>({type,data:canvas.toDataURL(type).split(',')[1]}));
  });
  await page.getByTestId('file-input').setInputFiles(images.map((f,i)=>({name:`image-${i}.${i ? 'jpg' : 'png'}`,mimeType:f.type,buffer:Buffer.from(f.data,'base64')})));
  await page.getByTestId('process').click(); await expect(page.getByTestId('download')).toBeVisible();
  expect((await PDFDocument.load((await download(page)).bytes)).getPageCount()).toBe(2);
  await page.getByRole('button',{name:'Çalışma alanını temizle',exact:true}).click();
  await page.getByTestId('file-input').setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('<script>alert(1)</script>')});
  await expect(page.getByRole('alert')).toBeVisible();
  expect(violations).toEqual([]);
});

test('install cache, reload offline, run PDF tools and export without network', async ({page,context,browserName}) => {
  test.skip(browserName !== 'chromium', 'Service worker offline regression is run on Chromium; other projects cover tool workflows.');
  const violations = watchNetwork(context,page);
  await page.goto('/');
  await page.getByRole('button',{name:'Gizliliği doğrula',exact:true}).first().click();
  await expect(page.getByText('Çevrim dışı kullanıma hazır',{exact:true})).toBeVisible({timeout:60000});
  await context.setOffline(true);
  await page.reload();
  // View state is deliberately not persisted, so the home page reappears.
  await page.getByRole('button',{name:'Örnek PDF ile dene',exact:true}).click();
  await page.locator('.tool-pills').getByRole('button',{name:'PDF döndür',exact:true}).click();
  await page.getByTestId('process').click();await expect(page.getByTestId('download')).toBeVisible();
  expect((await PDFDocument.load((await download(page)).bytes)).getPage(0).getRotation().angle).toBe(90);
  await page.locator('.tool-pills').getByRole('button',{name:'PDF’den görsele',exact:true}).click();
  await page.getByTestId('process').click();await expect(page.getByTestId('download')).toBeVisible();
  expect(Object.keys(unzipSync((await download(page)).bytes))).toHaveLength(2);
  const stored = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) paths.push(new URL(request.url).pathname);
    return {paths,preferences:Object.keys(localStorage)};
  });
  expect(stored.paths.some(p=>/\.pdf$|\.zip$/.test(p))).toBe(false);
  for (const pattern of [/^\/assets\/pdf\.worker.*\.js$/, /^\/assets\/pdf\.worker.*\.mjs$/, /^\/pdf-assets\/cmaps\//, /^\/pdf-assets\/standard_fonts\//, /^\/pdf-assets\/wasm\//]) expect(stored.paths.some(p=>pattern.test(p))).toBe(true);
  expect(stored.preferences.sort()).toEqual(['localpdf-language','localpdf-theme']);
  expect(violations).toEqual([]);
});

test('language/theme, keyboard access, responsive layout and PWA headers', async ({page}) => {
  const response = await page.goto('/');
  expect(response!.headers()['content-security-policy']).toContain("object-src 'none'");
  await page.getByRole('button',{name:'Dili değiştir',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Make light work of PDFs. Keep control of your files.'})).toBeVisible();
  await page.getByRole('button',{name:'Dark theme',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:`test-results/home-${test.info().project.name}.png`,fullPage:true});
});

test('file chooser and actual drop events both accept local PDFs', async ({page,context}) => {
  const violations=watchNetwork(context,page);
  const buffer=await synthetic();
  await page.goto('/');
  const chooserPromise=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Dosya seç',exact:true}).click();
  await (await chooserPromise).setFiles({name:'chooser.pdf',mimeType:'application/pdf',buffer});
  await expect(page.getByText('chooser.pdf',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Çalışma alanını temizle',exact:true}).click();
  const dataTransfer=await page.evaluateHandle(bytes=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)],'dropped.pdf',{type:'application/pdf'}));
    return transfer;
  },Array.from(buffer));
  await page.locator('.dropzone').dispatchEvent('drop',{dataTransfer});
  await dataTransfer.dispose();
  await expect(page.getByText('dropped.pdf',{exact:true})).toBeVisible();
  await page.getByTestId('process').click();await expect(page.getByTestId('download')).toBeVisible();
  expect((await PDFDocument.load((await download(page)).bytes)).getPageCount()).toBe(3);
  expect(violations).toEqual([]);
});

test('empty, damaged, encrypted and oversized files never produce fake success', async ({page,context}) => {
  const violations=watchNetwork(context,page);
  const cases=[
    {name:'empty.pdf',buffer:Buffer.alloc(0),message:/Dosya boş/},
    {name:'damaged.pdf',buffer:Buffer.from('%PDF-1.7\ninvalid document'),message:/PDF okunamadı/},
    {name:'encrypted.pdf',buffer:Buffer.from(encryptedFixture()),message:/Şifreli PDF/},
  ];
  for(const input of cases){
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({name:input.name,mimeType:'application/pdf',buffer:input.buffer});
    await expect(page.getByRole('alert')).toContainText(input.message);
    await expect(page.getByTestId('download')).toHaveCount(0);
  }
  await page.goto('/');
  await page.evaluate(()=>{
    const bytes=new Uint8Array(50*1024*1024+1);bytes.set(new TextEncoder().encode('%PDF-1.7'));
    const transfer=new DataTransfer();transfer.items.add(new File([bytes],'oversized.pdf',{type:'application/pdf'}));
    const input=document.querySelector<HTMLInputElement>('[data-testid="file-input"]')!;
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.getByRole('alert')).toContainText('50 MB');
  await expect(page.getByTestId('download')).toHaveCount(0);
  expect(violations).toEqual([]);
});
