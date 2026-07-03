import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPageByUrl = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Pages: { getPageByUrl } },
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./pages');
};

beforeEach(() => { getPageByUrl.mockReset(); });

describe('loadPageByUrl', () => {
  it('returns normalized page on success', async () => {
    getPageByUrl.mockResolvedValue({
      id: 7,
      identifier: 'about-us',
      pageUrl: 'about-us',
      localizeInfos: { en_US: { title: 'About Us' } },
      attributeValues: { en_US: { body_id1: { value: 'hi' } } },
    });
    const { loadPageByUrl } = await importFresh();
    const page = await loadPageByUrl('about-us');
    expect(page).toMatchObject({
      id: 7,
      identifier: 'about-us',
      pageUrl: 'about-us',
      title: 'About Us',
    });
  });

  it('reads flat attributeValues when the SDK unwrapped the per-locale slice', async () => {
    getPageByUrl.mockResolvedValue({
      id: 8,
      identifier: 'flat-page',
      pageUrl: 'flat-page',
      localizeInfos: { en_US: { title: 'Flat Page' } },
      // No `en_US` wrapper — attributes sit directly on `attributeValues`.
      attributeValues: {
        body_id1: { value: 'hi' },
        marker_x: { value: 'y' },
      },
    });
    const { loadPageByUrl } = await importFresh();
    const page = await loadPageByUrl('flat-page');
    expect(page).not.toBeNull();
    expect(page!.attributeValues).toMatchObject({
      body_id1: { value: 'hi' },
      marker_x: { value: 'y' },
    });
    // No leftover locale wrapper leaked into the attrs map.
    expect(page!.attributeValues.en_US).toBeUndefined();
  });

  it('returns null when response is an error object', async () => {
    getPageByUrl.mockResolvedValue({ statusCode: 404, message: 'Page not found' });
    const { loadPageByUrl } = await importFresh();
    expect(await loadPageByUrl('does-not-exist')).toBeNull();
  });

  it('returns null when SDK throws', async () => {
    getPageByUrl.mockRejectedValue(new Error('network'));
    const { loadPageByUrl } = await importFresh();
    expect(await loadPageByUrl('any')).toBeNull();
  });
});
