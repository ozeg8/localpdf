import { writeFile, readFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// No dependency installation, permissions changes, environment dumps or user documents.
const root = fileURLToPath(new URL('..', import.meta.url));
async function writable(directory) {
  const file = path.join(directory, `.localpdf-probe-${randomUUID()}`);
  let owned = false;
  try {
    await writeFile(file, 'LocalPDF permission probe', { flag: 'wx' }); owned = true;
    const value = await readFile(file, 'utf8');
    return { ok: value === 'LocalPDF permission probe' };
  } catch (error) { return { ok: false, code: error.code, syscall: error.syscall }; }
  finally { if (owned) await unlink(file); }
}
async function exists(file) { try { await access(file); return true; } catch { return false; } }
const network = await new Promise(resolve => {
  const request = https.get('https://registry.npmjs.org/-/ping', { timeout: 8000 }, response => {
    response.resume(); resolve({ ok: response.statusCode === 200, status: response.statusCode });
  });
  request.on('error', error => resolve({ ok: false, code: error.code, syscall: error.syscall }));
  request.on('timeout', () => request.destroy(Object.assign(new Error('Timed out'), { code: 'TIMEOUT' })));
});
const projectWrite = await writable(root);
const cache = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache');
console.log(JSON.stringify({
  node: process.version, executable: process.execPath,
  projectWrite, defaultWindowsNpmCacheWrite: process.platform === 'win32' ? await writable(cache) : 'not checked',
  registry: network,
  lockfile: await exists(path.join(root, 'package-lock.json')),
  dependencies: await exists(path.join(root, 'node_modules', 'pdf-lib', 'package.json')),
  productionBuild: await exists(path.join(root, 'dist', 'index.html')),
}, null, 2));
if (!network.ok || !projectWrite.ok) process.exitCode = 1;
