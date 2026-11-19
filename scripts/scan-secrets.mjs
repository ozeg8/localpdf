import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function scanSecrets(root = process.cwd()) {
  const findings = [];
  const excluded = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report', '.sites-runtime', 'artifacts', '.tools']);
  const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, /\bgithub_pat_[A-Za-z0-9_]{50,}\b/, /\bAKIA[0-9A-Z]{16}\b/, /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/];
  async function walk(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      if (excluded.has(item.name)) continue;
      const file = path.join(dir, item.name);
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) { await walk(file); continue; }
      if (/\.env(?:\.|$)/.test(item.name) && item.name !== '.env.example') { findings.push(path.relative(root, file)); continue; }
      if (/\.(pdf|har|pem|key|p12|pfx)$/i.test(item.name)) { findings.push(path.relative(root, file)); continue; }
      if (/\.(png|woff2?|ttf|jpg|jpeg|zip)$/i.test(item.name)) continue;
      const text = await readFile(file, 'utf8');
      if (patterns.some(pattern => pattern.test(text))) findings.push(path.relative(root, file));
    }
  }
  await walk(root);
  return findings;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = await scanSecrets();
  if (findings.length) { console.error('Potential secrets or personal documents in:', ...findings); process.exitCode = 1; }
  else console.log('No matches in the source-tree secret scan. Heuristic scan; not proof of absence.');
}
