import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMenusByMarker = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Menus: { getMenusByMarker } },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./menus');
};

beforeEach(() => { getMenusByMarker.mockReset(); });

describe('loadMenu', () => {
  it('normalizes nested menu structure', async () => {
    getMenusByMarker.mockResolvedValue({
      id: 1,
      identifier: 'header',
      localizeInfos: { en_US: { title: 'Main Menu' } },
      pages: [
        {
          id: 2,
          pageUrl: 'women',
          parentId: null,
          position: 1,
          localizeInfos: { en_US: { title: "Women's", menuTitle: "Women's" } },
          children: [
            {
              id: 36,
              pageUrl: 'shoes',
              parentId: 2,
              position: 1,
              localizeInfos: { en_US: { title: 'Shoes', menuTitle: 'Shoes' } },
              children: [],
            },
          ],
        },
      ],
    });
    const { loadMenu } = await importFresh();
    const menu = await loadMenu('header');
    expect(menu).not.toBeNull();
    expect(menu!.identifier).toBe('header');
    expect(menu!.title).toBe('Main Menu');
    expect(menu!.pages).toHaveLength(1);
    expect(menu!.pages[0]).toMatchObject({
      id: 2,
      pageUrl: 'women',
      title: "Women's",
      menuTitle: "Women's",
    });
    expect(menu!.pages[0].children[0]).toMatchObject({
      id: 36,
      pageUrl: 'shoes',
      menuTitle: 'Shoes',
    });
  });

  it('returns null when API returns error object', async () => {
    getMenusByMarker.mockResolvedValue({ statusCode: 404, message: 'Menu not found' });
    const { loadMenu } = await importFresh();
    expect(await loadMenu('missing')).toBeNull();
  });

  it('returns null when SDK throws', async () => {
    getMenusByMarker.mockRejectedValue(new Error('network'));
    const { loadMenu } = await importFresh();
    expect(await loadMenu('any')).toBeNull();
  });

  it('falls back to first language when requested lang is missing', async () => {
    getMenusByMarker.mockResolvedValue({
      id: 1,
      identifier: 'footer',
      localizeInfos: { ru_RU: { title: 'Подвал' } },
      pages: [],
    });
    const { loadMenu } = await importFresh();
    const menu = await loadMenu('footer');
    expect(menu!.title).toBe('Подвал');
  });
});

describe('loadMenu — disabled', () => {
  it('returns null when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadMenu } = await import('./menus');
    expect(await loadMenu('header')).toBeNull();
    vi.doUnmock('../index');
  });
});
