import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const allowed = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'BlueOak-1.0.0', '(MIT OR Apache-2.0)', '(MIT AND BSD-3-Clause)', '(MIT AND Zlib)', 'Python-2.0', 'CC0-1.0', 'Unlicense', 'MPL-2.0']);
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const entries = [];
async function check(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;
    const location = path.join(dir, item.name);
    if (item.name.startsWith('@')) { await check(location); continue; }
    const pkg = JSON.parse(await readFile(path.join(location, 'package.json'), 'utf8'));
    if (!allowed.has(pkg.license)) throw Error(`Review license before publishing: ${pkg.name}@${pkg.version}: ${JSON.stringify(pkg.license)}`);
    const lockKey = location.split(path.sep).join('/');
    // Lightning CSS is an unmodified build-time tool. Do not silently allow MPL
    // code to become part of the browser runtime without a fresh license review.
    if (pkg.license === 'MPL-2.0' && lock.packages[lockKey]?.dev !== true) throw Error(`Runtime MPL dependency needs review: ${pkg.name}`);
    const notices = [];
    for (const file of await readdir(location)) if (/^(licen[sc]e|notice|copying)(\.|$)/i.test(file)) notices.push(await readFile(path.join(location, file), 'utf8'));
    if (pkg.name === 'pako') notices.push(await readFile(path.join(location, 'lib/zlib/README'), 'utf8'));
    entries.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository, notices });
    try { await check(path.join(location, 'node_modules')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
await check('node_modules');
await writeFile('THIRD_PARTY_NOTICES.json', JSON.stringify(entries.sort((a, b) => a.name.localeCompare(b.name)), null, 2) + '\n');
console.log(`Reviewed ${entries.length} installed package license declarations. Check bundled third-party notices separately.`);
