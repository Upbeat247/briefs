import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** JSON safe to sit inside a <script> block. */
function payload(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028|\u2029/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
}

export function renderPage({ entries, streams, builtAt }) {
  const css = fs.readFileSync(path.join(here, 'app.css'), 'utf8');
  const js = fs.readFileSync(path.join(here, 'app.js'), 'utf8');

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f7f6f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)">
<title>Briefs</title>
<style>${css}</style>
</head>
<body>
<div class="progress" id="progress"></div>

<header class="top">
  <div class="wrap">
    <div class="top-row">
      <h1 class="brand">Briefs <span>&middot; weekly reading</span></h1>
      <div class="spacer"></div>
      <input id="search" class="search" type="search" placeholder="Search briefs&hellip;" aria-label="Search briefs" autocomplete="off">
      <button id="theme" class="icon-btn" title="Toggle theme" aria-label="Toggle theme">&#9790;</button>
    </div>
    <div id="chrome">
      <div class="filters" id="filters"></div>
    </div>
  </div>
</header>

<main class="wrap">
  <div id="list"></div>
  <div id="article" hidden></div>
</main>

<footer class="wrap">
  Personal study notes &middot; ${entries.length} briefs &middot; built ${builtAt}
</footer>

<script>
window.__BRIEFS__ = ${payload(entries)};
window.__STREAMS__ = ${payload(streams)};
</script>
<script>${js}</script>
</body>
</html>
`;
}
