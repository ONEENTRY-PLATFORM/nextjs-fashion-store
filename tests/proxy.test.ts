import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The proxy is what makes the as-needed scheme real: bare paths render as the
 * default locale via a *rewrite* (URL unchanged), and an explicit default
 * prefix redirects away so `/cart` and `/en/cart` never both serve the page.
 *
 * `NextRequest` is heavier than these tests need, so the proxy is exercised
 * with a minimal stand-in carrying just `nextUrl`.
 */
const importProxy = async (codes?: string[]) => {
  vi.resetModules();
  // The routed list is a build-time snapshot of the OE project settings; mock
  // it rather than the environment, which no longer configures locales.
  vi.doMock('@/lib/oneentry/locales.generated', () => ({
    GENERATED_CMS_LOCALES: codes ?? ['en_US'],
  }));
  return import('../proxy');
};

type StubUrl = URL & { clone: () => StubUrl };

/** Minimal `NextRequest['nextUrl']` stand-in: only `clone()` is used. */
function makeNextUrl(pathname: string, search = ''): StubUrl {
  const url = new URL(`https://shop.test${pathname}${search}`);
  return Object.assign(url, { clone: () => makeNextUrl(pathname, search) });
}

/**
 * Minimal `NextRequest` stand-in: only `nextUrl` and its `clone()` are used.
 * `as never` keeps it assignable to the real parameter type without pulling in
 * `NextRequest` — the return type is annotated on `makeNextUrl` instead, so the
 * stub still type-checks internally.
 */
function makeRequest(pathname: string, search = '') {
  const nextUrl = makeNextUrl(pathname, search);
  return { nextUrl, url: nextUrl.toString() } as never;
}

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock('@/lib/oneentry/locales.generated');
  vi.resetModules();
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
    const { proxy } = await importProxy(['en_US', 'fr_FR']);
    const res = proxy(makeRequest('/fr/cart'));

    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('redirects the redundant default prefix to the bare URL', async () => {
    const { proxy } = await importProxy(['en_US', 'fr_FR']);
    const res = proxy(makeRequest('/en/cart'));

    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('/cart');
    expect(res.headers.get('location')).not.toContain('/en/cart');
  });

  it('redirects /en to the site root', async () => {
    const { proxy } = await importProxy(['en_US', 'fr_FR']);
    const res = proxy(makeRequest('/en'));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/');
  });

  it('still rewrites bare paths to the default', async () => {
    const { proxy } = await importProxy(['en_US', 'fr_FR']);
    const res = proxy(makeRequest('/cart'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/cart');
  });

  it('does not mistake a normal first segment for a locale', async () => {
    const { proxy } = await importProxy(['en_US', 'fr_FR']);
    const res = proxy(makeRequest('/product/42'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/product/42');
  });
});

/**
 * Product ids are integers, and the route behind them streams — its `notFound()` lands after the
 * 200 is on the wire, and the render is stored as an ISR entry regardless. So an id that cannot
 * exist is answered here instead, where nothing renders and nothing is cached.
 */
describe('proxy — product id guard', () => {
  it('answers 404 for a non-numeric product id', async () => {
    const { proxy } = await importProxy(['en_US', 'de_DE']);
    const res = proxy(makeRequest('/product/not-a-real-id'));

    expect(res.status).toBe(404);
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('answers 404 for a non-numeric id under a locale prefix', async () => {
    const { proxy } = await importProxy(['en_US', 'de_DE']);
    expect(proxy(makeRequest('/de/product/wat')).status).toBe(404);
  });

  it('answers 404 for a trailing segment after the id', async () => {
    const { proxy } = await importProxy(['en_US', 'de_DE']);
    expect(proxy(makeRequest('/product/42/reviews')).status).toBe(404);
  });

  it('lets a numeric id through', async () => {
    const { proxy } = await importProxy(['en_US', 'de_DE']);
    const res = proxy(makeRequest('/product/10071'));

    expect(res.status).not.toBe(404);
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/product/10071');
  });

  it('leaves a query string on a numeric id alone', async () => {
    const { proxy } = await importProxy(['en_US', 'de_DE']);
    const res = proxy(makeRequest('/product/10071', '?color=red'));
    expect(res.status).not.toBe(404);
  });
});
