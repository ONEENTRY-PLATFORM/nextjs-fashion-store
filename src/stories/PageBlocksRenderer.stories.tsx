'use client';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React, { useEffect } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { useAppDispatch } from '@/app/store/hooks';
import { recentlyViewedActions } from '@/app/store/recentlyViewedSlice';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';

import { MOCK_OOS_PRODUCT, MOCK_PRODUCT, MOCK_SALE_PRODUCT } from './mockData';

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

/** Single product-list block with an unknown marker. */
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

/** Seeds `state.recentlyViewed.items` with two products, then renders a block whose `type === 'recently_viewed_block'`. The inner `<RecentlyViewedBlockSlot>` reads from Redux and surfaces the deduped trail. */
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

/** Homepage-flavor: hero + category + promo blocks. */
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

/** Recently-viewed trail sourced from Redux. */
export const RecentlyViewedFromRedux: Story = {
  args: { blocks: [] },
  render: () => <WithRecentlyViewed />,
};

/** Block with a `title` but empty `products` and an unknown marker/type. */
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
