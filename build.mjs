#!/usr/bin/env node
/**
 * Builds dist/index.html — one self-contained file holding every brief.
 *
 * No dependencies: Node reads the source repos' .ts data files directly.
 * The output makes zero network requests, so it behaves identically served
 * from GitHub Pages or opened from disk with file://.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { collect, STREAMS } from './lib/normalize.mjs';
import { renderPage } from './lib/page.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const sources = {
  apiInspector: process.env.API_INSPECTOR_DIR || path.join(root, '..', 'api-inspector'),
  ascend: process.env.ASCEND_DIR || path.join(root, '..', 'ascend'),
};

for (const [name, dir] of Object.entries(sources)) {
  if (!fs.existsSync(dir)) {
    console.error(`Source repo not found: ${name} -> ${dir}`);
    process.exit(1);
  }
}

const entries = await collect(sources);

const builtAt = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const html = renderPage({ entries, streams: STREAMS, builtAt });

const out = path.join(root, 'docs', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');

const byStream = {};
for (const e of entries) byStream[e.stream] = (byStream[e.stream] || 0) + 1;

console.log(`docs/index.html  ${(html.length / 1024).toFixed(0)} KB  ${entries.length} briefs`);
for (const [k, v] of Object.entries(byStream)) {
  console.log(`  ${STREAMS[k].label.padEnd(20)} ${v}`);
}
console.log(`  newest: ${entries[0].date} — ${entries[0].title.slice(0, 60)}`);

// `npm run offline` also drops a dated copy on the Desktop, for the case where
// the hosted page turns out to be blocked and the file has to travel by hand.
if (process.argv.includes('--offline')) {
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(os.homedir(), 'Desktop', `Briefs-${stamp}.html`);
  fs.writeFileSync(dest, html);
  console.log(`offline copy      ${dest}`);
}
