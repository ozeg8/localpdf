import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const headers = { 'Cache-Control': 'no-cache' };
let wildcard = false;
for (const line of (await readFile(new URL('../public/_headers', import.meta.url), 'utf8')).split(/\r?\n/)) {
  if (!line.trim()) continue;
  if (!/^\s/.test(line)) { wildcard = line.trim() === '/*'; continue; }
  if (!wildcard) continue;
  const separator = line.indexOf(':');
  if (separator > 0) headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
try { await stat(path.join(root, 'index.html')); }
catch { console.error('Hazir uygulama bulunamadi. Tam paketi cikarin veya npm run build calistirin.'); process.exit(1); }

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('_') || part.startsWith('.') || part.includes(':'))) {
      res.writeHead(403, headers).end(); return;
    }
    if (!(await stat(file)).isFile()) { res.writeHead(404, headers).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, headers).end(); }
});

let port = Number(process.env.LOCALPDF_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid LOCALPDF_PORT');
const firstPort = port;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < Math.min(firstPort + 10, 65535)) {
    server.listen(++port, '127.0.0.1'); return;
  }
  console.error('LocalPDF baslatilamadi:', error.message); process.exitCode = 1;
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`\nLocalPDF hazir: ${url}\nBu pencereyi uygulamayi kullanirken acik tutun. Kapatmak icin Ctrl+C.\n`);
  if (process.platform === 'win32' && !process.argv.includes('--no-open')) {
    execFile('cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true }, error => {
      if (error) console.log('Tarayicinizda bu adresi acin:', url);
    });
  }
});
server.listen(port, '127.0.0.1');
