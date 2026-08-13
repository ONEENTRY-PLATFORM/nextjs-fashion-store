/** Allow-list sanitizer for rich text authored in the OneEntry admin. */

/** Tags kept in the output. */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'span',
  'div',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'mark',
  'small',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
]);

/** Tags dropped together with their content — several switch the parser into another content mode, the classic way to smuggle markup past a filter. */
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'noscript',
  'template',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'link',
  'meta',
  'base',
  'title',
  'head',
  'frame',
  'frameset',
  'audio',
  'video',
  'source',
  'track',
  'canvas',
  'portal',
]);

/** Attributes accepted on every allowed tag. */
const GLOBAL_ATTRS = new Set(['title', 'dir', 'lang']);

/** Per-tag attributes. */
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  ol: new Set(['start']),
};

/** Attributes carrying a URL — scheme-checked before they are kept. */
const URL_ATTRS = new Set(['href', 'src']);

/** Tags that never have a closing partner. */
const VOID_TAGS = new Set(['br', 'hr', 'img']);

/** Matches an HTML comment or a single tag. */
const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;

/** Matches one `name`, `name=value`, `name="value"` or `name='value'` pair. */
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

/** Escape the characters that could re-open markup once the result is handed back to `innerHTML`. Only `<` and `"` are touched. */
function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/** Whether a URL attribute value is safe to keep. */
function isSafeUrl(value: string): boolean {
  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_m, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&(tab|newline|colon|NewLine|Tab);/gi, (_m, name: string) => (name.toLowerCase() === 'colon' ? ':' : ''));
  // Strip everything the URL parser treats as insignificant noise (NUL, tab, newline, form feed, spaces) — `java\tscript:` is a working payload.
  const cleaned = decoded.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  return !/^(javascript|vbscript|livescript|mocha|data|blob|file|about):/.test(cleaned);
}

/** Rebuild the attribute list of an allowed tag, keeping only what the allow-list permits. */
function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const permitted = TAG_ATTRS[tag];
  const kept = new Map<string, string>();

  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';

    if (name.startsWith('on')) continue;
    if (!GLOBAL_ATTRS.has(name) && !permitted?.has(name)) continue;
    if (URL_ATTRS.has(name) && !isSafeUrl(value)) continue;
    // Only `_blank` is meaningful on this content; anything else is noise.
    if (name === 'target' && value !== '_blank') continue;
    // A repeated attribute is resolved by browsers in favour of the first occurrence.
    if (kept.has(name)) continue;

    kept.set(name, value);
  }

  // `target="_blank"` without `rel` lets the opened page reach back through `window.opener`, so the author's own `rel` is replaced, not merged.
  if (kept.get('target') === '_blank') kept.set('rel', 'noopener noreferrer');

  const out = [...kept].map(([name, value]) => `${name}="${escapeText(value)}"`);
  return out.length > 0 ? ` ${out.join(' ')}` : '';
}

/** Sanitize CMS-authored HTML for `dangerouslySetInnerHTML`. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  let out = '';
  let cursor = 0;
  /** Nesting depth inside a drop-with-content element. */
  let skipDepth = 0;
  let skipTag = '';

  TOKEN_RE.lastIndex = 0;
  let token: RegExpExecArray | null;

  while ((token = TOKEN_RE.exec(html)) !== null) {
    const text = html.slice(cursor, token.index);
    cursor = TOKEN_RE.lastIndex;

    if (skipDepth === 0) out += escapeText(text);

    // Comments and CDATA carry no renderable content.
    const name = token[1];
    if (name === undefined) continue;

    const tag = name.toLowerCase();
    const isClosing = token[0].startsWith('</');

    if (skipDepth > 0) {
      if (tag === skipTag) {
        if (isClosing) skipDepth -= 1;
        else skipDepth += 1;
      }
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      // A stray closing tag has nothing to open — just drop it.
      if (!isClosing && !token[0].endsWith('/>')) {
        skipDepth = 1;
        skipTag = tag;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) continue; // drop the markup, keep the text

    if (isClosing) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      continue;
    }

    const attrs = sanitizeAttributes(tag, token[2] ?? '');
    out += VOID_TAGS.has(tag) ? `<${tag}${attrs} />` : `<${tag}${attrs}>`;
  }

  if (skipDepth === 0) out += escapeText(html.slice(cursor));
  return out;
}
