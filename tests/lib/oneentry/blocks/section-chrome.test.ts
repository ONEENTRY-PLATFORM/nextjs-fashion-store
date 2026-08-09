import { describe, expect, it } from 'vitest';

import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { sectionChromeFromBlock } from '@/lib/oneentry/blocks/section-chrome';

const block = (attrs?: Record<string, { value?: unknown }>): PageBlock => ({
  marker: 'homepage_best_sellers',
  type: 'trending_block',
  title: 'Best Sellers',
  position: 0,
  products: [],
  ...(attrs ? { attributeValues: attrs as PageBlock['attributeValues'] } : {}),
});

describe('sectionChromeFromBlock', () => {
  it('reads the canonical markers', () => {
    expect(
      sectionChromeFromBlock(
        block({
          section_eyebrow: { value: 'Collection' },
          section_subtitle: { value: 'Shop the drop' },
          section_view_all_href: { value: '/sale' },
          section_view_all_label: { value: 'See all' },
        }),
      ),
    ).toEqual({
      eyebrow: 'Collection',
      subtitle: 'Shop the drop',
      viewAllHref: '/sale',
      viewAllLabel: 'See all',
    });
  });

  it('accepts the shorter marker spellings tenants also use', () => {
    expect(
      sectionChromeFromBlock(
        block({
          eyebrow: { value: 'New' },
          view_all_href: { value: '/new' },
        }),
      ),
    ).toEqual({ eyebrow: 'New', viewAllHref: '/new' });
  });

  it('omits blank and non-string values so the caller keeps its fallback', () => {
    expect(
      sectionChromeFromBlock(
        block({
          section_eyebrow: { value: '   ' },
          section_subtitle: { value: 42 },
        }),
      ),
    ).toEqual({});
  });

  it('returns an empty object for a block with no attributes', () => {
    expect(sectionChromeFromBlock(block())).toEqual({});
    expect(sectionChromeFromBlock(undefined)).toEqual({});
  });

  it('trims surrounding whitespace', () => {
    expect(sectionChromeFromBlock(block({ section_eyebrow: { value: '  Collection  ' } }))).toEqual({
      eyebrow: 'Collection',
    });
  });
});
