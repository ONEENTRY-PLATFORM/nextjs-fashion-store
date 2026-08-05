import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPageByUrl = vi.fn();
const getChildPagesByParentUrl = vi.fn();

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApiSafe: () => ({ Pages: { getPageByUrl, getChildPagesByParentUrl } }),
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// `unstable_cache` wraps `loadInfoPageSlugs`; in tests it must pass through.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/catalog/info-pages');
};

beforeEach(() => {
  getPageByUrl.mockReset();
  getChildPagesByParentUrl.mockReset();
});

describe('infoSlugCandidate', () => {
  it('accepts a bare single-segment path', async () => {
    const { infoSlugCandidate } = await importFresh();
    expect(infoSlugCandidate('shipping-policy')).toBe('shipping-policy');
  });

  it('strips the /info/ prefix', async () => {
    const { infoSlugCandidate } = await importFresh();
    expect(infoSlugCandidate('info/shipping-policy')).toBe('shipping-policy');
  });

  it('rejects multi-segment paths — those belong to the catalog tree', async () => {
    const { infoSlugCandidate } = await importFresh();
    expect(infoSlugCandidate('women/clothing')).toBeNull();
    expect(infoSlugCandidate('info/a/b')).toBeNull();
  });

  it('rejects empty input', async () => {
    const { infoSlugCandidate } = await importFresh();
    expect(infoSlugCandidate('')).toBeNull();
    expect(infoSlugCandidate('/')).toBeNull();
    expect(infoSlugCandidate('info/')).toBeNull();
  });
});

describe('resolveInfoPageSlug', () => {
  it('returns the slug when OE knows the page', async () => {
    getPageByUrl.mockResolvedValue({
      id: 7,
      identifier: 'shipping-policy',
      pageUrl: 'shipping-policy',
      localizeInfos: { en_US: { title: 'Shipping' } },
    });
    const { resolveInfoPageSlug } = await importFresh();
    expect(await resolveInfoPageSlug('shipping-policy')).toBe('shipping-policy');
  });

  it('returns null when OE has no such page', async () => {
    getPageByUrl.mockResolvedValue({ statusCode: 404 });
    const { resolveInfoPageSlug } = await importFresh();
    expect(await resolveInfoPageSlug('not-a-page')).toBeNull();
  });

  it('never queries OE for a path that cannot be an info slug', async () => {
    const { resolveInfoPageSlug } = await importFresh();
    expect(await resolveInfoPageSlug('women/clothing')).toBeNull();
    expect(getPageByUrl).not.toHaveBeenCalled();
  });
});

describe('loadInfoPageSlugs', () => {
  it('returns child page slugs ordered by position', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      { id: 2, pageUrl: 'returns', position: 2 },
      { id: 1, pageUrl: 'shipping', position: 1 },
    ]);
    const { loadInfoPageSlugs } = await importFresh();
    expect(await loadInfoPageSlugs()).toEqual(['shipping', 'returns']);
  });

  it('unwraps the paginated `items` shape', async () => {
    getChildPagesByParentUrl.mockResolvedValue({ items: [{ id: 1, pageUrl: 'careers' }] });
    const { loadInfoPageSlugs } = await importFresh();
    expect(await loadInfoPageSlugs()).toEqual(['careers']);
  });

  it('returns an empty list when the tenant has no `info` parent', async () => {
    getChildPagesByParentUrl.mockResolvedValue({ statusCode: 404 });
    const { loadInfoPageSlugs } = await importFresh();
    expect(await loadInfoPageSlugs()).toEqual([]);
  });

  it('swallows SDK failures — the sitemap must still build', async () => {
    getChildPagesByParentUrl.mockRejectedValue(new Error('network'));
    const { loadInfoPageSlugs } = await importFresh();
    expect(await loadInfoPageSlugs()).toEqual([]);
  });
});
