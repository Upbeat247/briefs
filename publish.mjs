#!/usr/bin/env node
/**
 * Commits docs/index.html and pushes. GitHub Pages serves main:/docs, so the
 * push is the deploy. Exits 0 with a note when there is nothing new, so the
 * weekly routines can call it unconditionally.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

git('add', 'docs');

if (!git('status', '--porcelain', 'docs')) {
  console.log('No content change — nothing to publish.');
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 10);
git('commit', '-m', `Rebuild briefs — ${stamp}`);

// Three routines push here across Fri/Sat/Sun; rebase first so a push from
// another machine or a re-run never turns into a rejected push.
try {
  git('pull', '--rebase', 'origin', 'main');
} catch {
  console.warn('Rebase pull failed — pushing the local commit as-is.');
}

git('push', 'origin', 'HEAD');

console.log(`Published. https://upbeat247.github.io/briefs/`);
