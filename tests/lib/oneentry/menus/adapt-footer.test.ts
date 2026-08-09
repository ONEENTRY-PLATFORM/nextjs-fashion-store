import { describe, expect, it } from 'vitest';

import { footerBottomLinksFromMenu, footerColumnsFromMenu, footerHref } from '@/lib/oneentry/menus/adapt-footer';
import type { MenuPageNode } from '@/lib/oneentry/menus/menus';

const node = (over: Partial<MenuPageNode> & { id: number }): MenuPageNode => ({
  pageUrl: '',
  title: '',
  menuTitle: '',
  parentId: null,
  position: 0,
  children: [],
  ...over,
});

describe('footerHref', () => {
  it('maps a page slug to its canonical root path', () => {
    // Info pages answer on both `/about-us` and `/info/about-us`; the bare
    // form is the canonical URL, so that is what the footer links to.
    expect(footerHref('about-us')).toBe('/about-us');
    expect(footerHref('stores')).toBe('/stores');
  });

  it('treats a multi-segment slug as a root path', () => {
    expect(footerHref('women/clothing')).toBe('/women/clothing');
  });

  it('passes through explicit paths and absolute URLs', () => {
    expect(footerHref('/checkout/delivery')).toBe('/checkout/delivery');
    expect(footerHref('https://oneentry.cloud')).toBe('https://oneentry.cloud');
  });

  it('falls back to the homepage for an empty slug', () => {
    expect(footerHref('')).toBe('/');
    expect(footerHref('   ')).toBe('/');
  });
});

describe('footerColumnsFromMenu', () => {
  it('turns nested root nodes into columns ordered by position', () => {
    const menu = [
      node({
        id: 2,
        position: 2,
        menuTitle: 'Help',
        children: [
          node({ id: 21, position: 2, menuTitle: 'Delivery', pageUrl: 'delivery' }),
          node({ id: 22, position: 1, menuTitle: 'FAQ', pageUrl: 'faq' }),
        ],
      }),
      node({
        id: 1,
        position: 1,
        menuTitle: 'About Company',
        children: [node({ id: 11, menuTitle: 'Store Locator', pageUrl: 'stores' })],
      }),
    ];

    const columns = footerColumnsFromMenu(menu);
    expect(columns.map((c) => c.title)).toEqual(['About Company', 'Help']);
    expect(columns[0]?.links).toEqual([{ key: '11', label: 'Store Locator', href: '/stores' }]);
    // Children are ordered by their own position, not by array order.
    expect(columns[1]?.links.map((l) => l.label)).toEqual(['FAQ', 'Delivery']);
  });

  it('falls back to `title` when `menuTitle` is empty', () => {
    const menu = [
      node({ id: 1, title: 'Service', children: [node({ id: 11, title: 'Careers', pageUrl: 'careers' })] }),
    ];
    expect(footerColumnsFromMenu(menu)[0]).toMatchObject({
      title: 'Service',
      links: [{ label: 'Careers', href: '/careers' }],
    });
  });

  it('ignores childless nodes and columns whose children have no labels', () => {
    const menu = [
      node({ id: 1, menuTitle: 'Terms', pageUrl: 'terms' }),
      node({ id: 2, menuTitle: 'Empty', children: [node({ id: 21, pageUrl: 'x' })] }),
    ];
    expect(footerColumnsFromMenu(menu)).toEqual([]);
  });

  it('returns nothing for a flat menu, letting the caller keep its fallback', () => {
    const menu = [
      node({ id: 1, menuTitle: 'Sitemap', pageUrl: 'sitemap' }),
      node({ id: 2, menuTitle: 'Privacy', pageUrl: 'privacy-policy' }),
    ];
    expect(footerColumnsFromMenu(menu)).toEqual([]);
  });
});

describe('footerBottomLinksFromMenu', () => {
  it('keeps only childless nodes, ordered by position', () => {
    const menu = [
      node({ id: 3, position: 2, menuTitle: 'Privacy', pageUrl: 'privacy-policy' }),
      node({ id: 1, position: 1, menuTitle: 'Sitemap', pageUrl: 'sitemap' }),
      node({ id: 9, menuTitle: 'Help', children: [node({ id: 91, menuTitle: 'FAQ', pageUrl: 'faq' })] }),
    ];

    expect(footerBottomLinksFromMenu(menu)).toEqual([
      { key: '1', label: 'Sitemap', href: '/sitemap' },
      { key: '3', label: 'Privacy', href: '/privacy-policy' },
    ]);
  });

  it('drops nodes with no label', () => {
    expect(footerBottomLinksFromMenu([node({ id: 1, pageUrl: 'orphan' })])).toEqual([]);
  });

  it('drops a column header whose links are not filled in yet', () => {
    // Grouping custom items carry `-` as their address. One with no children is
    // an empty column, not a legal link — without this it would render in the
    // bottom bar pointing at `/-`.
    expect(footerBottomLinksFromMenu([node({ id: 1, menuTitle: 'Customer Support', pageUrl: '-' })])).toEqual([]);
  });
});
