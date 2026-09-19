/**
 * Reads the three brief streams straight out of the source repos' TypeScript
 * data files (Node strips the types natively) and flattens them into one shape
 * the reader can render.
 *
 *   integrity   api-inspector  DIGESTS  ids D_*   (coaching brief, Sat run)
 *   asset       api-inspector  DIGESTS  ids AI_*  (deep-dive, Fri run)
 *   leadership  ascend         BRIEFS   ids B_*   (Ascend brief, Sun run)
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { inline, paragraphs, plain } from './md.mjs';

// No publish day in the label: the routines don't all run on the day they are
// named after, and every card already carries its real date.
export const STREAMS = {
  integrity: { label: 'Integrity Coaching', accent: 'teal' },
  asset: { label: 'Asset Integrity', accent: 'orange' },
  leadership: { label: 'Leadership', accent: 'blue' },
};

const load = (file) => import(pathToFileURL(path.resolve(file)).href);

// ---------- shared pieces ----------

function linkList(links = []) {
  if (!links.length) return '';
  const items = links
    .map((l) => {
      const note = l.note ? `<span class="lnk-note">${inline(l.note)}</span>` : '';
      return `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${inline(l.title)}</a>
        <span class="lnk-src">${inline(l.source || '')}</span>${note}</li>`;
    })
    .join('\n');
  return `<div class="links"><h4>Sources</h4><ul>${items}</ul></div>`;
}

/** Ascend Block[] -> HTML. */
function blocks(list = []) {
  return list
    .map((b) => {
      switch (b.kind) {
        case 'prose':
          return paragraphs(b.text);
        case 'heading':
          return `<h3>${inline(b.text)}</h3>`;
        case 'callout': {
          const title = b.title ? `<div class="callout-t">${inline(b.title)}</div>` : '';
          return `<aside class="callout callout-${b.tone || 'note'}">${title}${paragraphs(b.text)}</aside>`;
        }
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          const items = (b.items || []).map((i) => `<li>${inline(i)}</li>`).join('');
          return `<${tag} class="prose-list">${items}</${tag}>`;
        }
        case 'framework': {
          const steps = (b.steps || [])
            .map(
              (s, i) => `<li><span class="fw-n">${i + 1}</span>
                <div><strong>${inline(s.label)}</strong><p>${inline(s.detail)}</p></div></li>`
            )
            .join('');
          return `<div class="framework"><h4>${inline(b.name)}</h4><ol>${steps}</ol></div>`;
        }
        case 'example': {
          const before = b.before
            ? `<div class="ex-side"><span class="ex-lbl ex-before">Before</span>${paragraphs(b.before)}</div>`
            : '';
          const note = b.note ? `<p class="ex-note">${inline(b.note)}</p>` : '';
          return `<div class="example"><h4>${inline(b.title)}</h4>${before}
            <div class="ex-side"><span class="ex-lbl ex-after">After</span>${paragraphs(b.after)}</div>${note}</div>`;
        }
        default:
          return '';
      }
    })
    .join('\n');
}

// ---------- per-source mapping ----------

function fromDigest(d) {
  const stream = d.id.startsWith('AI_') ? 'asset' : 'integrity';

  // Friday titles carry a "Friday Integrity Deep-Dive #N — " prefix; the reader
  // shows the stream and number in the kicker, so drop it from the headline.
  const m = d.title.match(/^Friday Integrity Deep-Dive #(\d+)\s*[—-]\s*(.*)$/s);
  const title = m ? m[2] : d.title;

  const sections = (d.items || []).map((it) => ({
    heading: it.heading,
    html: paragraphs(it.body) + linkList(it.links),
  }));

  return {
    id: d.id,
    stream,
    date: d.weekOf,
    title,
    summary: d.intro || '',
    sections,
    action: d.action ? { label: 'This week', text: d.action } : null,
  };
}

function fromBrief(b) {
  const sections = [];

  if (b.concept?.length) sections.push({ heading: 'The idea', html: blocks(b.concept) });
  if (b.caseStudy?.blocks?.length) {
    sections.push({ heading: b.caseStudy.title || 'Case study', html: blocks(b.caseStudy.blocks) });
  }
  if (b.reflectionPrompts?.length) {
    const items = b.reflectionPrompts.map((p) => `<li>${inline(p)}</li>`).join('');
    sections.push({ heading: 'Reflect', html: `<ul class="prose-list">${items}</ul>` });
  }
  if (b.links?.length) sections.push({ heading: 'Going deeper', html: linkList(b.links) });

  const action = b.stretch
    ? {
        label: 'Try this week',
        text: `**${b.stretch.title}** — ${b.stretch.detail}\n\nSuccess looks like: ${b.stretch.successLooksLike}`,
      }
    : null;

  return {
    id: b.id,
    stream: 'leadership',
    date: b.date,
    title: b.title,
    summary: b.theme || '',
    sections,
    action,
  };
}

// ---------- assembly ----------

export async function collect({ apiInspector, ascend }) {
  const entries = [];

  const digests = await load(path.join(apiInspector, 'lib/data/digests.ts'));
  for (const d of digests.DIGESTS) entries.push(fromDigest(d));

  const briefs = await load(path.join(ascend, 'lib/data/briefs.ts'));
  for (const b of briefs.BRIEFS) entries.push(fromBrief(b));

  // Newest first, and number each stream in the order it was actually published.
  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const counts = {};
  for (const e of [...entries].reverse()) {
    counts[e.stream] = (counts[e.stream] || 0) + 1;
    e.number = counts[e.stream];
  }

  for (const e of entries) {
    const body = e.sections.map((s) => `${s.heading} ${s.html}`).join(' ');
    const words = plain(`${e.summary} ${body}`).split(/\s+/).filter(Boolean).length;
    e.minutes = Math.max(1, Math.round(words / 220));
    e.words = words;
    // Search index: lower-cased plain text, capped so the payload stays sane.
    e.q = plain(`${e.title} ${e.summary} ${body}`).toLowerCase().slice(0, 6000);
    e.summaryHtml = e.summary ? inline(e.summary) : '';
    if (e.action) e.action.html = paragraphs(e.action.text);
  }

  return entries;
}
