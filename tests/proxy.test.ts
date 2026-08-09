import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The proxy is what makes the as-needed scheme real: bare paths render as the
 * default locale via a *rewrite* (URL unchanged), and an explicit default
 * prefix redirects away so `/cart` and `/en/cart` never both serve the page.
 *
 * `NextRequest` is heavier than these tests need, so the proxy is exercised
 * with a minimal stand-in carrying just `nextUrl`.
 */
const ORIGINAL = { ...process.env };

const importProxy = async (locales?: string) => {
  vi.resetModules();
  if (locales === undefined) delete process.env.NEXT_PUBLIC_LOCALES;
  else process.env.NEXT_PUBLIC_LOCALES = locales;
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE = 'en_US';
  return import('../proxy');
};

/** Minimal `NextRequest` stand-in: only `nextUrl` and its `clone()` are used. */
function makeRequest(pathname: string, search = '') {
  const url = new URL(`https://shop.test${pathname}${search}`);
  const nextUrl = Object.assign(url, { clone: () => makeRequest(pathname, search).nextUrl });
  return { nextUrl, url: url.toString() } as never;
}

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('proxy — single locale', () => {
  it('rewrites bare paths to the default locale without changing the URL', async () => {
    const { proxy } = await importProxy(undefined);
    const res = proxy(makeRequest('/cart'));

    // A rewrite, not a redirect: the shopper keeps seeing `/cart`.
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/cart');
    expect(res.status).toBe(200);
  });

  it('rewrites the site root', async () => {
    const { proxy } = await importProxy(undefined);
    const res = proxy(makeRequest('/'));
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/en$/);
  });

  it('leaves the query string intact', async () => {
    const { proxy } = await importProxy(undefined);
    const res = proxy(makeRequest('/sale', '?gender=women'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('gender=women');
  });

  it('does not redirect /en when only one locale is routed', async () => {
    // With a single locale nothing should ever 308 — there is no second URL
    // shape to canonicalise against.
    const { proxy } = await importProxy(undefined);
    const res = proxy(makeRequest('/en/cart'));
    expect(res.status).not.toBe(308);
  });
});

describe('proxy — multiple locales', () => {
  it('passes a non-default locale through untouched', async () => {
    const { proxy } = await importProxy('en_US,fr_FR');
    const res = proxy(makeRequest('/fr/cart'));

    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('redirects the redundant default prefix to the bare URL', async () => {
    const { proxy } = await importProxy('en_US,fr_FR');
    const res = proxy(makeRequest('/en/cart'));

    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('/cart');
    expect(res.headers.get('location')).not.toContain('/en/cart');
  });

  it('redirects /en to the site root', async () => {
    const { proxy } = await importProxy('en_US,fr_FR');
    const res = proxy(makeRequest('/en'));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/');
  });

  it('still rewrites bare paths to the default', async () => {
    const { proxy } = await importProxy('en_US,fr_FR');
    const res = proxy(makeRequest('/cart'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/cart');
  });

  it('does not mistake a normal first segment for a locale', async () => {
    const { proxy } = await importProxy('en_US,fr_FR');
    const res = proxy(makeRequest('/product/42'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/product/42');
  });
});
