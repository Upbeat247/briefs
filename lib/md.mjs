/**
 * Minimal inline-markdown renderer. The source content uses **bold**, *italic*,
 * `code` and [text](url) inside otherwise-plain prose. Everything is escaped
 * first, so nothing in the content can inject markup.
 */

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escaped text -> inline HTML. Code spans are parked first so they aren't re-parsed. */
export function inline(s) {
  const code = [];
  let out = esc(s).replace(/`([^`]+)`/g, (_, c) => {
    code.push(c);
    return `@@CODE${code.length - 1}@@`;
  });

  out = out
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');

  return out.replace(/@@CODE(\d+)@@/g, (_, i) => `<code>${code[i]}</code>`);
}

/** A blank-line-separated prose blob -> a stack of <p>. */
export function paragraphs(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`)
    .join('\n');
}

/** Strip markup, for word counts and the search index. */
export function plain(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
