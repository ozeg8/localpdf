import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { scanSecrets } from '../scripts/scan-secrets.mjs';
import vm from 'node:vm';

async function sourceFiles(dir = 'src') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await sourceFiles(file));
    else if (/\.(ts|tsx)$/.test(file)) result.push({ file, text: await readFile(file, 'utf8') });
  }
  return result;
}
test('application source has no upload, remote endpoint or document persistence call', async () => {
  const sources = await sourceFiles();
  for (const { file, text } of sources) {
    assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, file);
    assert.doesNotMatch(text, /https?:\/\//, file);
    assert.doesNotMatch(text, /\b(?:indexedDB|showSaveFilePicker|showOpenFilePicker)\b/, file);
  }
  const writes = sources.flatMap(({ text }) => [...text.matchAll(/localStorage\.setItem\('([^']+)'/g)].map(m => m[1]));
  assert.deepEqual(writes.sort(), ['localpdf-language', 'localpdf-theme']);
  const render = await readFile('src/pdf/render.ts', 'utf8');
  assert.match(render, /enableXfa: false/);
  assert.doesNotMatch(sources.map(f => f.text).join('\n'), /dangerouslySetInnerHTML|<iframe|<embed|<object/);
});
test('Pages CSP forbids external scripts, embedded documents and framing', async () => {
  const headers = await readFile('public/_headers', 'utf8');
  for (const required of ["default-src 'self'", "script-src 'self'", "worker-src 'self'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'none'"]) assert.ok(headers.includes(required));
  assert.ok(!headers.includes("'unsafe-eval'"));
  assert.match(headers, /X-Content-Type-Options: nosniff/);
});
test('manifest supports installable standalone PWA with local icons', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map(i => i.sizes), ['192x192', '512x512']);
  for (const icon of manifest.icons) {
    const bytes = await readFile(`public${icon.src}`);
    assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  }
});
test('service worker caches only build GET assets; navigation works without a network', async () => {
  const events = new Map(), stored = new Map();
  let networkCalls = 0, waited;
  const cache = { addAll: async urls => { for (const url of urls) stored.set(url, `cached:${url}`); }, match: async req => stored.get(typeof req === 'string' ? req : new URL(req.url).pathname) };
  const caches = { open: async () => cache, match: cache.match, keys: async () => ['localpdf-test'], delete: async () => true };
  const code = (await readFile('scripts/sw-template.js', 'utf8')).replace('__CACHE__', 'localpdf-test').replace('__ASSETS__', JSON.stringify(['/index.html', '/assets/app.js']));
  vm.runInNewContext(code, { URL, Set, caches, fetch: async () => { networkCalls++; throw Error('offline'); }, self: { location: {origin:'https://localpdf.test'}, addEventListener: (key, value) => events.set(key, value), clients: {matchAll:async()=>[],claim:async()=>{}},skipWaiting:async()=>{} } });
  events.get('install')({waitUntil: promise => { waited = promise; }}); await waited;
  assert.deepEqual([...stored.keys()], ['/index.html','/assets/app.js']);
  for (const request of [{url:'https://other.test/file',method:'GET'}, {url:'https://localpdf.test/upload',method:'POST'}, {url:'https://localpdf.test/private.pdf',method:'GET'}]) {
    let intercepted = false; events.get('fetch')({request,respondWith:()=>{intercepted=true;}}); assert.equal(intercepted,false);
  }
  let response;
  events.get('fetch')({request:{url:'https://localpdf.test/',method:'GET',mode:'navigate'},respondWith:promise=>{response=promise;}});
  assert.equal(await response, 'cached:/index.html');
  assert.equal(networkCalls,0);
});
test('source-tree secret scan has no findings (heuristic only)', async () => { assert.deepEqual(await scanSecrets(), []); });
