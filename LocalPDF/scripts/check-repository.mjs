import { execFileSync } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSecrets } from './scan-secrets.mjs';

export const projectRoot = fileURLToPath(new URL('..', import.meta.url));
async function publicationFiles() {
  // ZIP exports have no .git. Never accidentally enumerate a parent repository.
  let ownGit = false;
  try { await lstat(path.join(projectRoot, '.git')); ownGit = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (ownGit) return [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: projectRoot, encoding: 'utf8' }).split('\0').filter(Boolean))].sort();
  const excluded = new Set(['.git','node_modules','dist','artifacts','test-results','playwright-report','coverage','.tools','.sites-runtime','.idea','.vscode']);
  const files = [];
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const relative = prefix + entry.name;
      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(path.join(directory, entry.name), relative + '/');
      else files.push(relative);
    }
  }
  await walk(projectRoot);
  return files.sort();
}
export function publicationPathIssue(file) {
  if (file.includes('/')) return undefined;
  if (/^download(?:\s*\(\d+\))?(?:\.[^.]+)?$/i.test(file)) return 'Browser download filename requires content review';
  if (/^README\s*\(\d+\)\.md$/i.test(file)) return 'Renamed README belongs in its original directory';
  if (/\.(tsx?|mjs|css|ya?ml|png|jpe?g|svg)$/i.test(file) && !['vite.config.ts', 'playwright.config.ts'].includes(file)) return 'Flattened source, workflow or image at repository root';
  if (['_headers', 'manifest.webmanifest', 'capture-info.json'].includes(file)) return 'Public asset or capture metadata at repository root';
  return undefined;
}
export async function checkRepository() {
  const files = await publicationFiles();
  const findings = [], warnings = [];
  const blocked = /(^|\/)(node_modules|dist|artifacts|test-results|playwright-report|\.git|\.tools|\.sites-runtime|\.idea|\.vscode)(\/|$)|(^|\/)\.env(?:\.|$)|\.(pdf|zip|har|pem|key|p12|pfx|exe|dll|sqlite3?|db|dmp|log)$/i;
  let bytes = 0;
  for (const file of files) {
    const layoutIssue = publicationPathIssue(file);
    if (layoutIssue) findings.push(`${layoutIssue}: ${file}`);
    if (file !== '.env.example' && blocked.test(file)) findings.push(`Excluded/private file in Git candidates: ${file}`);
    const absolute = path.resolve(projectRoot, file);
    if (!absolute.startsWith(projectRoot)) { findings.push(`Path outside repository: ${file}`); continue; }
    const info = await lstat(absolute);
    if (!info.isFile()) { findings.push(`Not a regular file: ${file}`); continue; }
    bytes += info.size;
    if (info.size > 10 * 1024 * 1024) findings.push(`Review large file: ${file}`);
    if (/\.(md|json|ya?ml|m?js|tsx?|html|css|cmd|ps1)$/.test(file)) {
      const text = await readFile(absolute, 'utf8');
      if (/[A-Za-z]:[\\/]Users[\\/][^\\/\s]+/.test(text)) findings.push(`Personal absolute Windows profile path: ${file}`);
    }
  }
  for (const required of ['README.md','README.en.md','LICENSE','SECURITY.md','CONTRIBUTING.md','package-lock.json','.gitignore','.github/workflows/ci.yml','.github/workflows/security.yml','docs/screenshots/README.md']) if (!files.includes(required)) findings.push(`Missing publication file: ${required}`);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const section of ['dependencies','devDependencies']) for (const [name, version] of Object.entries(pkg[section] ?? {})) if (lock.packages[''][section]?.[name] !== version) findings.push(`Package/lock mismatch: ${name}`);
  if (lock.packages['node_modules/fflate']?.version === '0.8.2') warnings.push('Known fflate ZIP decoder advisory remains: upgrade to 0.8.3 and rerun tests. See SECURITY.md.');
  for (const workflow of ['ci','security']) {
    const text = await readFile(new URL(`../.github/workflows/${workflow}.yml`, import.meta.url), 'utf8');
    for (const use of text.matchAll(/uses:\s*([^\s#]+)/g)) if (!/@[a-f0-9]{40}$/.test(use[1])) findings.push(`Unpinned action: ${use[1]}`);
    if (/pull_request_target\s*:/.test(text)) findings.push(`Privileged PR trigger in ${workflow}`);
  }
  const screenshots = files.filter(file=>/^docs\/screenshots\/.*\.png$/.test(file));
  if (screenshots.length !== 8) findings.push(`Expected 8 curated screenshots, found ${screenshots.length}`);
  for (const file of await scanSecrets(projectRoot)) findings.push(`Secret/private-file scan: ${file}`);
  return { files, bytes, screenshots, findings, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkRepository();
  console.log(JSON.stringify({ files: result.files.length, bytes: result.bytes, screenshots: result.screenshots.length, findings: result.findings, warnings: result.warnings }, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
