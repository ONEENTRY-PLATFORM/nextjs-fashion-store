import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPageByUrl = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Pages: { getPageByUrl } },
  isOneEntryEnabled: true,
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
