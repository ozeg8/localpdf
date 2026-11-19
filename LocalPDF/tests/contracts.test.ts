import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileKind, imageDimensions, pageIndices, validateInputs, validateOrder, safeName, LIMITS } from '../src/pdf/contracts.ts';
import { samplePdf } from '../src/pdf/sample.ts';

test('ranges preserve user order and reject malformed/duplicate/out-of-bounds selections', () => {
  assert.deepEqual(pageIndices('3,1-2', 4), [2, 0, 1]);
  assert.deepEqual(pageIndices('', 3), [0,1,2]);
  for (const value of ['0', '5', '2-1', '1,1', '1,', '-1', '1.5', '<script>', '1-999999999']) assert.throws(() => pageIndices(value, 4));
  assert.throws(() => pageIndices('', LIMITS.pages + 1));
});
test('reordering must be a complete permutation', () => {
  assert.deepEqual(validateOrder([2,0,1], 3), [2,0,1]);
  for (const value of [[0,0], [0], [-1,0], [0,2], [0,0.5]]) assert.throws(() => validateOrder(value, 2));
});
test('magic bytes decide type, not misleading file extensions', () => {
  assert.equal(fileKind(new TextEncoder().encode('%PDF-1.7')), 'pdf');
  assert.equal(fileKind(new Uint8Array([255,216,255])), 'jpeg');
  assert.throws(() => fileKind(new TextEncoder().encode('<script>alert(1)</script>')));
  assert.throws(() => validateInputs([]));
  assert.throws(() => validateInputs([{name: 'fake.pdf', bytes: new TextEncoder().encode('no pdf')} ]));
});
test('empty and oversized files are rejected with distinct actionable codes', () => {
  assert.throws(()=>validateInputs([{name:'empty.pdf',bytes:new Uint8Array()}]),{code:'EMPTY'});
  const bytes=new Uint8Array(LIMITS.perFile+1);bytes.set(new TextEncoder().encode('%PDF-1.7'));
  assert.throws(()=>validateInputs([{name:'oversized.pdf',bytes}]),{code:'SIZE'});
});
test('image dimensions are checked before decoded allocation', () => {
  const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]); png.set([73,72,68,82],12);
  const view = new DataView(png.buffer); view.setUint32(16, 100); view.setUint32(20, 200);
  assert.deepEqual(imageDimensions(png), {width:100,height:200});
  view.setUint32(16, 100000);
  assert.throws(() => imageDimensions(png));
  assert.throws(() => imageDimensions(new Uint8Array([255,216,255])));
});
test('names cannot create archive paths', () => {
  assert.equal(safeName('../../name.pdf'), '______name');
  assert.ok(!safeName('<img onerror=alert(1)>.pdf').includes('<'));
});
test('sample PDF has exact xref offsets and stream lengths and no personal data', async () => {
  const file = samplePdf();
  const text = await file.text();
  assert.equal(fileKind(new Uint8Array(await file.arrayBuffer())), 'pdf');
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  assert.ok(text.slice(xref).startsWith('xref'));
  for (const match of text.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) assert.equal(match[2].length, Number(match[1]));
  assert.ok(text.includes('No personal information.'));
});
