import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationPathIssue } from '../scripts/check-repository.mjs';

test('GitHub upload layout rejects flattened application, workflow and screenshot files', () => {
  for (const file of ['App.tsx','engine.ts','styles.css','ci.yml','security.yml','01-home-desktop.png','icon-192.png','_headers','manifest.webmanifest','capture-info.json']) assert.ok(publicationPathIssue(file),file);
});
test('download names and collision-renamed README files require review', () => {
  for (const file of ['download','download (1)','download (6)','README (3).md']) assert.ok(publicationPathIssue(file),file);
});
test('translations, independent gallery documentation and established local layout remain valid', () => {
  for (const file of ['README.md','README.en.md','docs/screenshots/README.md','docs/screenshots/01-home-desktop.png','public/icons/icon-192.png','src/pdf/engine.ts','.github/workflows/ci.yml','vite.config.ts','playwright.config.ts']) assert.equal(publicationPathIssue(file),undefined,file);
});
