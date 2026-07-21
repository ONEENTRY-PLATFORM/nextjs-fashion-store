'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageBlocksRenderer } from '../app/components/PageBlocksRenderer';
import type { PageBlock } from '../lib/oneentry/blocks/page-blocks';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT } from './mockData';
import { useAppDispatch } from '../app/store/hooks';
import { recentlyViewedActions } from '../app/store/recentlyViewedSlice';

const meta = {
  title: 'Components / PageBlocksRenderer',
  component: PageBlocksRenderer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof PageBlocksRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty blocks array — renders nothing. */
export const Empty: Story = {
  args: {
    blocks: [],
  },
};

/** Single product-list block with an unknown marker — falls through to
 *  `<NewArrivals>` as the generic safe layout. */
export const SingleProductBlock: Story = {
  args: {
    blocks: [
      {
        marker: 'catalog_page_recommendations',
        type: 'product_block',
        title: 'You May Also Like',
        position: 0,
        products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
      } satisfies PageBlock,
    ],
  },
};

/** Seeds `state.recentlyViewed.items` with two products, then renders a block
 *  whose `type === 'recently_viewed_block'`. The inner `<RecentlyViewedBlockSlot>`
 *  reads from Redux and surfaces the deduped trail. */
function WithRecentlyViewed() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(recentlyViewedActions.addProduct(MOCK_SALE_PRODUCT));
    dispatch(recentlyViewedActions.addProduct(MOCK_PRODUCT));
  }, [dispatch]);
  return (
    <PageBlocksRenderer
      blocks={[
        {
          marker: 'recently_viewed',
          type: 'recently_viewed_block',
          title: 'Recently Viewed',
          position: 0,
          products: [],
        } satisfies PageBlock,
      ]}
    />
  );
}

/** Homepage-flavor: hero + category + promo blocks.
 *  Child components (HeroSlider, CategorySection, PromoBlock) load their own
 *  data via RTK Query when no `initial*` payloads are provided — they render
 *  in their loading/empty state in this variant. Pass `initial*` props to see
 *  the filled state (mirror what the homepage server component pre-fetches). */
export const HomepageBlocks: Story = {
  args: {
    blocks: [
      {
        marker: 'hero_slider',
        type: 'slider_block',
        title: '',
        position: 0,
        products: [],
      } satisfies PageBlock,
      {
        marker: 'category_section',
        type: 'category_block',
        title: '',
        position: 1,
        products: [],
      } satisfies PageBlock,
      {
        marker: 'promo_block',
        type: 'promo_block',
        title: '',
        position: 2,
        products: [],
      } satisfies PageBlock,
      {
        marker: 'new_arrivals',
        type: 'similar_products_block',
        title: 'New Arrivals',
        position: 3,
        products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
      } satisfies PageBlock,
    ],
  },
};

/** Recently-viewed trail sourced from Redux — two products pre-seeded via
 *  `recentlyViewedActions.addProduct`. The slot is hidden when the trail is
 *  empty, so the dispatch in `useEffect` is required for anything to render. */
export const RecentlyViewedFromRedux: Story = {
  args: { blocks: [] },
  render: () => <WithRecentlyViewed />,
};

/** Block with a `title` but empty `products` and an unknown marker/type — the
 *  title-only fallback renders a plain `<h2>` header section rather than
 *  returning null. Demonstrates the generic "admin block accepted" signal for
 *  any block type that has no dedicated component and no inline products.
 *  (Note: `cart_complement_block` is intentionally excluded from this path —
 *  it now returns null when empty because a cross-sell header without items
 *  is pure noise on the storefront.) */
export const TitleOnlyFallback: Story = {
  args: {
    blocks: [
      {
        marker: 'generic_info_block',
        type: 'generic_info_block',
        title: 'Complete Your Look',
        position: 0,
        products: [],
      } satisfies PageBlock,
    ],
  },
};
