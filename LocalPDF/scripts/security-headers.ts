import { readFileSync } from 'node:fs';

/** The Pages wildcard rule owns the security headers in all local servers too. */
export function securityHeaders(): Record<string, string> {
  const result: Record<string, string> = {};
  let wildcard = false;
  for (const line of readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { wildcard = line.trim() === '/*'; continue; }
    if (!wildcard) continue;
    const separator = line.indexOf(':');
    if (separator < 0) throw new Error('Invalid security header');
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  if (!result['Content-Security-Policy']) throw new Error('Missing Content-Security-Policy');
  return result;
}
