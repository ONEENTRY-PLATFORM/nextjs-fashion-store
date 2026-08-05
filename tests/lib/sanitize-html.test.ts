/**
 * The sanitizer is hand-rolled (isomorphic, zero-dependency), so its test
 * suite is the thing that makes it trustworthy. Every case below is a payload
 * shape that has been used against naive HTML filters in the wild.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize-html';

describe('sanitizeHtml — legitimate editor output survives', () => {
  it('keeps the tags the OE rich-text editor produces', () => {
    const html = '<p>Made from <strong>merino</strong> wool.</p><ul><li>Item</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('keeps headings, tables and figures', () => {
    const html = '<h2>Care</h2><table><tr><td colspan="2">Hand wash</td></tr></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('keeps safe links and images', () => {
    expect(sanitizeHtml('<a href="https://example.com/x">go</a>'))
      .toBe('<a href="https://example.com/x">go</a>');
    expect(sanitizeHtml('<a href="/women/clothing">go</a>'))
      .toBe('<a href="/women/clothing">go</a>');
    expect(sanitizeHtml('<a href="mailto:a@b.co">mail</a>'))
      .toBe('<a href="mailto:a@b.co">mail</a>');
    expect(sanitizeHtml('<img src="https://cdn.oneentry.cloud/a.jpg" alt="A">'))
      .toBe('<img src="https://cdn.oneentry.cloud/a.jpg" alt="A" />');
  });

  it('leaves already-encoded entities alone (no double-escaping)', () => {
    expect(sanitizeHtml('<p>Tom &amp; Jerry &lt;3</p>')).toBe('<p>Tom &amp; Jerry &lt;3</p>');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ])('returns "" for %s', (_label, input) => {
    expect(sanitizeHtml(input)).toBe('');
  });
});

describe('sanitizeHtml — event handlers', () => {
  it('strips onerror from an image but keeps the image', () => {
    expect(sanitizeHtml('<img src="x.jpg" onerror="alert(1)">'))
      .toBe('<img src="x.jpg" />');
  });

  it('strips handlers regardless of case and spacing', () => {
    expect(sanitizeHtml('<p OnMouseOver = "alert(1)">hi</p>')).toBe('<p>hi</p>');
    expect(sanitizeHtml("<p onclick='alert(1)'>hi</p>")).toBe('<p>hi</p>');
    expect(sanitizeHtml('<p onclick=alert(1)>hi</p>')).toBe('<p>hi</p>');
  });

  it('is not fooled by a `>` inside a quoted attribute value', () => {
    // A naive `<[^>]*>` match truncates here and leaks the rest as markup.
    expect(sanitizeHtml('<p title="a > b" onclick="alert(1)">hi</p>'))
      .toBe('<p title="a &gt; b">hi</p>'.replace('&gt;', '>'));
  });
});

describe('sanitizeHtml — script-bearing containers', () => {
  it('drops <script> together with its content', () => {
    expect(sanitizeHtml('before<script>alert(1)</script>after')).toBe('beforeafter');
  });

  it('drops <style>, <iframe> and <object> with their content', () => {
    expect(sanitizeHtml('<style>body{display:none}</style>ok')).toBe('ok');
    expect(sanitizeHtml('<iframe src="//evil"></iframe>ok')).toBe('ok');
    expect(sanitizeHtml('<object data="x"><param></object>ok')).toBe('ok');
  });

  it('drops parser-context switchers used to smuggle markup', () => {
    expect(sanitizeHtml('<svg><script>alert(1)</script></svg>ok')).toBe('ok');
    expect(sanitizeHtml('<noscript><p>x</p></noscript>ok')).toBe('ok');
    expect(sanitizeHtml('<template><img src=x onerror=alert(1)></template>ok')).toBe('ok');
    expect(sanitizeHtml('<math><mtext></mtext></math>ok')).toBe('ok');
  });

  it('handles nested same-name containers without leaking the tail', () => {
    expect(sanitizeHtml('<script><script>alert(1)</script></script>tail')).toBe('tail');
  });

  it('drops forms and their controls', () => {
    expect(sanitizeHtml('<form action="//evil"><input name="p"></form>ok')).toBe('ok');
  });
});

describe('sanitizeHtml — dangerous URL schemes', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'about:blank',
  ])('drops href="%s"', (href) => {
    const out = sanitizeHtml(`<a href="${href}">x</a>`);
    expect(out).toBe('<a>x</a>');
  });

  it('drops schemes hidden behind HTML entities', () => {
    expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="&#x6a;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('drops schemes split by control characters', () => {
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="java\nscript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('drops javascript: on img src too', () => {
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).toBe('<img />');
  });
});

describe('sanitizeHtml — layout / click-jacking attributes', () => {
  it('drops style', () => {
    expect(sanitizeHtml('<p style="position:fixed;inset:0">hi</p>')).toBe('<p>hi</p>');
  });

  it('drops class, so injected utility classes cannot overlay the page', () => {
    expect(sanitizeHtml('<div class="fixed inset-0 z-50">hi</div>')).toBe('<div>hi</div>');
  });

  it('forces rel on target="_blank" and ignores the author\'s own rel', () => {
    expect(sanitizeHtml('<a href="https://x.co" target="_blank" rel="nofollow">x</a>'))
      .toBe('<a href="https://x.co" target="_blank" rel="noopener noreferrer">x</a>');
    // …including when `rel` is written first.
    expect(sanitizeHtml('<a rel="nofollow" href="https://x.co" target="_blank">x</a>'))
      .toBe('<a rel="noopener noreferrer" href="https://x.co" target="_blank">x</a>');
  });

  it('drops a target other than _blank', () => {
    expect(sanitizeHtml('<a href="/x" target="_top">x</a>')).toBe('<a href="/x">x</a>');
  });
});

describe('sanitizeHtml — parser edge cases', () => {
  it('neutralises an unterminated tag instead of leaving it to the browser', () => {
    // At end of input browsers happily materialise an unclosed tag, so the
    // stray `<` has to be escaped rather than passed through.
    const out = sanitizeHtml('<p>ok</p><img src=x onerror=alert(1)');
    expect(out).toContain('&lt;img');
    expect(out).not.toMatch(/<img/);
  });

  it('escapes a bare < in prose', () => {
    expect(sanitizeHtml('5 < 7')).toBe('5 &lt; 7');
  });

  it('drops comments, including the conditional-comment form', () => {
    expect(sanitizeHtml('a<!-- <script>alert(1)</script> -->b')).toBe('ab');
    expect(sanitizeHtml('a<![CDATA[<script>x</script>]]>b')).toBe('ab');
  });

  it('drops unknown tags but keeps their text', () => {
    expect(sanitizeHtml('<marquee>hi</marquee>')).toBe('hi');
    expect(sanitizeHtml('<custom-element>hi</custom-element>')).toBe('hi');
  });

  it('drops a stray closing tag of a content-dropping element', () => {
    expect(sanitizeHtml('ok</script>still ok')).toBe('okstill ok');
  });

  it('keeps a quote in prose renderable', () => {
    // `&quot;` renders as `"`, so escaping it in text is display-neutral.
    expect(sanitizeHtml('<p>say "hi"</p>')).toBe('<p>say &quot;hi&quot;</p>');
  });

  it('does not let a quoted attribute value break out', () => {
    // The whole payload is one single-quoted value, so the `"` inside it must
    // come back escaped — the text may still read "onmouseover", but it can no
    // longer terminate the attribute and become a handler.
    const out = sanitizeHtml('<a href=\'/x" onmouseover="alert(1)\'>x</a>');
    expect(out).toBe('<a href="/x&quot; onmouseover=&quot;alert(1)">x</a>');
    expect(out).not.toMatch(/"\s+onmouseover\s*=/);
  });
});
