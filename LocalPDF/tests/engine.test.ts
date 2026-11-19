import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFRawStream, PDFArray, decodePDFRawStream } from 'pdf-lib';
import { runCore, loadPdf } from '../src/pdf/engine.ts';
import { samplePdf } from '../src/pdf/sample.ts';
import type { Tool, Options } from '../src/pdf/contracts.ts';
import { encryptedFixture } from './encrypted-fixture.ts';

async function fixture(pages = [200,300,400]) {
  const doc = await PDFDocument.create();
  for (const width of pages) doc.addPage([width,500]);
  return {name:'synthetic.pdf',bytes:await doc.save({useObjectStreams:false})};
}
async function run(tool: Tool, options: Options = {}) { return runCore({tool,inputs:[await fixture()],options}); }
async function content(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map(page => {
    const contents = page.node.Contents();
    if (!contents) return '';
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref=>doc.context.lookup(ref)) : [contents];
    return streams.map(stream=>{
      assert.ok(stream instanceof PDFRawStream);
      return new TextDecoder().decode(decodePDFRawStream(stream).decode());
    }).join('\n');
  });
}

test('merge preserves all source pages in caller order', async () => {
  const result = await runCore({tool:'merge',inputs:[await fixture([200,300]),await fixture([400])],options:{}});
  const doc = await loadPdf(result.files[0].bytes);
  assert.deepEqual(doc.getPages().map(p=>p.getWidth()), [200,300,400]);
});
test('split range exports only selected pages in specified order; separate mode creates valid PDFs', async () => {
  const result = await run('split',{pages:'3,1'});
  assert.deepEqual((await loadPdf(result.files[0].bytes)).getPages().map(p=>p.getWidth()),[400,200]);
  const separate = await run('split',{pages:'1,3',separate:true});
  assert.equal(separate.files.length,2);
  for (const file of separate.files) assert.equal((await loadPdf(file.bytes)).getPageCount(),1);
});
test('reorder uses exact page permutation', async () => {
  const result = await run('reorder',{order:[2,0,1]});
  assert.deepEqual((await loadPdf(result.files[0].bytes)).getPages().map(p=>p.getWidth()),[400,200,300]);
  await assert.rejects(run('reorder',{order:[0,0,1]}));
});
test('rotation changes only selected pages', async () => {
  const result = await run('rotate',{pages:'2',angle:90});
  assert.deepEqual((await loadPdf(result.files[0].bytes)).getPages().map(p=>p.getRotation().angle),[0,90,0]);
});
test('delete removes exact pages and rejects an empty result', async () => {
  const result = await run('delete',{pages:'2'});
  assert.deepEqual((await loadPdf(result.files[0].bytes)).getPages().map(p=>p.getWidth()),[200,400]);
  await assert.rejects(run('delete',{pages:'1-3'}));
});
test('watermark adds actual PDF drawing operators only to selected pages', async () => {
  const result = await run('watermark',{text:'CONFIDENTIAL',pages:'2'});
  const streams = await content(result.files[0].bytes);
  assert.doesNotMatch(streams[0],/434f4e464944454e5449414c/i);
  assert.match(streams[1],/434f4e464944454e5449414c/i);
  await assert.rejects(run('watermark',{text:'\u0130'}));
});
test('page numbering emits distinct real content', async () => {
  const result = await run('number',{start:7});
  const streams = await content(result.files[0].bytes);
  for (const [index, hex] of ['37','38','39'].entries()) assert.ok(streams[index].includes(`<${hex}>`));
});
test('PNG becomes a real embedded PDF page', async () => {
  // Original code-generated icon; no user or downloaded fixture.
  const png = new Uint8Array(await readFile('public/icons/icon-192.png'));
  const result = await runCore({tool:'images',inputs:[{name:'pixel.png',bytes:png}],options:{}});
  const doc = await loadPdf(result.files[0].bytes);
  assert.equal(doc.getPageCount(),1); assert.ok(doc.getPage(0).node.Resources());
});
test('compression reports measured bytes and returns original on no improvement', async () => {
  const input = await fixture();
  const result = await runCore({tool:'compress',inputs:[input],options:{}});
  assert.equal(result.before,input.bytes.length);
  assert.equal(result.after,result.files[0].bytes.length);
  assert.equal(result.reduced,result.after < result.before);
  if (!result.reduced) assert.deepEqual(result.files[0].bytes,input.bytes);
  assert.equal((await loadPdf(result.files[0].bytes)).getPageCount(),3);
});
test('sample fixture parses; malformed inputs fail without mutating caller buffers', async () => {
  const bytes = new Uint8Array(await samplePdf().arrayBuffer());
  assert.equal((await loadPdf(bytes)).getPageCount(),2);
  const original = bytes.slice();
  await runCore({tool:'rotate',inputs:[{name:'sample.pdf',bytes}],options:{angle:180}});
  assert.deepEqual(bytes,original);
  const rotated = await runCore({tool:'rotate',inputs:[{name:'sample.pdf',bytes}],options:{angle:90}});
  assert.ok((await content(rotated.files[0].bytes))[0].includes('LocalPDF - Sample 1'));
  await assert.rejects(loadPdf(new TextEncoder().encode('%PDF-invalid')));
});

test('a genuinely encrypted PDF decrypts with PDF.js but is explicitly rejected by LocalPDF', async () => {
  const bytes = encryptedFixture();
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: bytes.slice(), password: 'localpdf-test', useSystemFonts: true });
  try {
    const doc = await loading.promise;
    assert.equal(doc.numPages, 1);
    const content = await (await doc.getPage(1)).getTextContent();
    assert.ok(content.items.some(item => 'str' in item && item.str.includes('LocalPDF encrypted fixture')));
  } finally { await loading.destroy(); }
  await assert.rejects(loadPdf(bytes), { code: 'ENCRYPTED' });
});

test('zero-page and over-limit PDFs fail explicitly instead of creating empty downloads', async () => {
  const empty = await PDFDocument.create();
  await assert.rejects(loadPdf(await empty.save({ addDefaultPage: false })), { code: 'EMPTY' });
  const large = await PDFDocument.create();
  for (let i = 0; i < 301; i++) large.addPage([200,300]);
  await assert.rejects(loadPdf(await large.save()), { code: 'PAGES' });
});
