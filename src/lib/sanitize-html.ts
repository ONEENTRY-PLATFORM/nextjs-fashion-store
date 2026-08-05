/**
 * Allow-list sanitizer for rich text authored in the OneEntry admin.
 *
 * Three places render CMS HTML through `dangerouslySetInnerHTML` (product
 * description, sale hero). The markup comes from the OE rich-text editor, so
 * the threat model is a malicious or compromised admin account — narrow, but
 * an injected `<img onerror>` would run with full access to the shopper's
 * session, which now lives in `localStorage`.
 *
 * Isomorphic on purpose: both call sites are Client Components, but Next.js
 * still renders them on the server, so sanitising only in the browser would
 * ship the raw payload in the initial HTML and fire before hydration. That
 * rules out DOM-based sanitisers, hence this tokenizer.
 *
 * It is deliberately conservative — it rebuilds output from an allow-list
 * rather than trying to strip known-bad patterns, so anything unanticipated
 * is dropped instead of passed through.
 */

/** Tags kept in the output. Anything else loses its markup but keeps its text. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
]);

/**
 * Tags dropped **together with their content**. Text inside them is never
 * plain prose, and several (`template`, `noscript`, `svg`, `math`) switch the
 * parser into a different content mode, which is the classic way to smuggle
 * markup past a naive filter.
 */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'applet', 'noscript', 'template',
  'svg', 'math', 'form', 'input', 'button', 'select', 'option', 'textarea',
  'link', 'meta', 'base', 'title', 'head', 'frame', 'frameset', 'audio', 'video',
  'source', 'track', 'canvas', 'portal',
]);

/** Attributes accepted on every allowed tag. */
const GLOBAL_ATTRS = new Set(['title', 'dir', 'lang']);

/**
 * Per-tag attributes. `class` and `style` are intentionally absent: neither
 * executes script, but on a Tailwind storefront an injected
 * `class="fixed inset-0 z-50"` (or a `style` overlay) is a ready-made
 * click-jacking surface.
 */
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

/**
 * Matches an HTML comment or a single tag. The attribute part tolerates `>`
 * inside quoted values, which a naive `<[^>]*>` would truncate — leaving the
 * rest of the attribute list to leak out as text.
 */
const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;

/** Matches one `name`, `name=value`, `name="value"` or `name='value'` pair. */
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

/**
 * Escape the characters that could re-open markup once the result is handed
 * back to `innerHTML`. Only `<` and `"` are touched — re-encoding `&` would
 * double-escape the entities the editor already produced.
 * @param {string} value - Raw text or attribute value.
 * @returns {string} Text that cannot break out of its context.
 */
function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/**
 * Whether a URL attribute value is safe to keep.
 *
 * Browsers ignore control characters and resolve HTML entities *before*
 * dispatching a URL scheme, so `java&#09;script:` and `&#106;avascript:` both
 * execute. Both are normalised away before the scheme is checked.
 * @param {string} value - Raw attribute value.
 * @returns {boolean} `true` when the scheme is safe to render.
 */
function isSafeUrl(value: string): boolean {
  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_m, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&(tab|newline|colon|NewLine|Tab);/gi, (_m, name: string) =>
      (name.toLowerCase() === 'colon' ? ':' : ''));
  // Strip everything the URL parser treats as insignificant noise (NUL,
  // tab, newline, form feed, spaces) — `java\tscript:` is a working payload.
  const cleaned = decoded.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  return !/^(javascript|vbscript|livescript|mocha|data|blob|file|about):/.test(cleaned);
}

/**
 * Rebuild the attribute list of an allowed tag, keeping only what the
 * allow-list permits. `on*` handlers can never match — they are not on any
 * list — but they are rejected explicitly so the intent survives a future
 * edit to the tables above.
 * @param {string} tag     - Lower-cased tag name.
 * @param {string} rawAttrs - Everything between the tag name and `>`.
 * @returns {string} A serialised attribute string, empty or leading-space-prefixed.
 */
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
    // A repeated attribute is resolved by browsers in favour of the first
    // occurrence — mirror that, so `href="ok" href="javascript:…"` cannot be
    // used to make the checked value lose to the unchecked one.
    if (kept.has(name)) continue;

    kept.set(name, value);
  }

  // `target="_blank"` without `rel` lets the opened page reach back through
  // `window.opener`, so the author's own `rel` is replaced, not merged.
  if (kept.get('target') === '_blank') kept.set('rel', 'noopener noreferrer');

  const out = [...kept].map(([name, value]) => `${name}="${escapeText(value)}"`);
  return out.length > 0 ? ` ${out.join(' ')}` : '';
}

/**
 * Sanitize CMS-authored HTML for `dangerouslySetInnerHTML`.
 * @param {string | null | undefined} html - Raw HTML from OneEntry.
 * @returns {string} Markup limited to the allow-list above; `''` when empty.
 */
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
