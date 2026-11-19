import { readFile, writeFile, readdir, cp, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'licenses'), { recursive: true });
await cp(path.join(root, 'LICENSE'), path.join(dist, 'licenses/LICENSE.txt'));
await cp(path.join(root, 'THIRD_PARTY_NOTICES.json'), path.join(dist, 'licenses/THIRD_PARTY_NOTICES.json'));
// Fonts, CMaps and decoders are local assets, including when offline.
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const source = path.join(root, 'node_modules/pdfjs-dist', directory);
  try { await stat(source); } catch (e) { if (e.code === 'ENOENT' && directory === 'iccs') continue; throw e; }
  await mkdir(path.join(dist, 'pdf-assets'), { recursive: true });
  await cp(source, path.join(dist, 'pdf-assets', directory), { recursive: true });
}
const assets = [];
const hash = createHash('sha256');
async function walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (entry.name === 'sw.js' || entry.name.startsWith('_')) continue;
    const bytes = await readFile(file);
    if (bytes.length > 25 * 1024 * 1024) throw Error(`Cloudflare Pages asset over 25 MiB: ${entry.name}`);
    const url = '/' + path.relative(dist, file).split(path.sep).join('/');
    assets.push(url); hash.update(url); hash.update(bytes);
  }
}
await walk(dist);
if (assets.length >= 20000) throw Error('Cloudflare Pages Free file-count limit exceeded');
const name = `localpdf-${hash.digest('hex').slice(0, 16)}`;
const template = await readFile(path.join(root, 'scripts/sw-template.js'), 'utf8');
await writeFile(path.join(dist, 'sw.js'), template.replace('__CACHE__', name).replace('__ASSETS__', JSON.stringify(assets)));
console.log(`Built ${assets.length + 1} local assets. Offline cache: ${name}`);
