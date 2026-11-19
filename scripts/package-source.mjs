import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import path from 'node:path';
import { checkRepository, projectRoot } from './check-repository.mjs';

const result = await checkRepository();
if (result.findings.length) throw new Error(result.findings.join('\n'));
const files = {}, hashes = [];
for (const file of result.files) {
  const bytes = new Uint8Array(await readFile(path.join(projectRoot, file)));
  files[`LocalPDF/${file}`] = bytes;
  hashes.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../artifacts/localpdf-source.zip', import.meta.url), zipSync(files, { level: 6 }));
const pictures = {};
for (const file of [...result.screenshots, 'docs/screenshots/README.md', 'docs/screenshots/capture-info.json']) pictures[`LocalPDF-screenshots/${path.basename(file)}`] = new Uint8Array(await readFile(path.join(projectRoot, file)));
await writeFile(new URL('../artifacts/localpdf-screenshots.zip', import.meta.url), zipSync(pictures, { level: 0 }));
await writeFile(new URL('../artifacts/source-manifest.json', import.meta.url), JSON.stringify({ createdAt: new Date().toISOString(), uploaded: false, warnings: result.warnings, files: hashes }, null, 2) + '\n');
console.log(`Prepared source ZIP (${result.files.length} files), screenshots ZIP and SHA-256 manifest in artifacts/. No upload performed.`);
for (const warning of result.warnings) console.warn(warning);
