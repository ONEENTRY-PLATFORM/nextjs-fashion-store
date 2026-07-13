import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProductCard } from '../app/components/ProductCard';
import { useAppDispatch } from '../app/store/hooks';
import { wishlistActions } from '../app/store/wishlistSlice';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT, MOCK_MULTICOLOR_PRODUCT, MOCK_WISHLIST_ITEM, MOCK_COMING_SOON_PRODUCT, MOCK_PREORDER_PRODUCT } from './mockData';

const meta = {
  title: 'Components / ProductCard',
  component: ProductCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { product: MOCK_PRODUCT },
};

export const WithSalePrice: Story = {
  name: 'Sale — with strike-through price',
  args: { product: MOCK_SALE_PRODUCT },
};

export const OutOfStock: Story = {
  name: 'Out of Stock — grayscale overlay',
  args: { product: MOCK_OOS_PRODUCT },
};

export const ManyColors: Story = {
  name: '6+ colors — "+N" overflow label',
  args: { product: MOCK_MULTICOLOR_PRODUCT },
};

export const ComingSoon: Story = {
  name: 'Coming Soon — statusIdentifier: coming_soon',
  args: { product: MOCK_COMING_SOON_PRODUCT },
};

export const PreOrder: Story = {
  name: 'Pre-order — statusIdentifier: preorder',
  args: { product: MOCK_PREORDER_PRODUCT },
};

export const MenAccent: Story = {
  name: 'Men accent color (#DA1E1E)',
  args: { product: MOCK_PRODUCT, accentColor: '#DA1E1E' },
};

export const Grid: Story = {
  name: 'Grid of 4',
  args: { product: MOCK_PRODUCT },
  render: () => (
    <div className="grid grid-cols-2 gap-4" style={{ width: 580 }}>
      <ProductCard product={MOCK_PRODUCT} />
      <ProductCard product={MOCK_SALE_PRODUCT} />
      <ProductCard product={MOCK_OOS_PRODUCT} />
      <ProductCard product={MOCK_MULTICOLOR_PRODUCT} />
    </div>
  ),
};

/** wishlistSlice — product already in Redux wishlist (heart filled) */
function WishlistedCard() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(wishlistActions.addItem(MOCK_WISHLIST_ITEM));
  }, [dispatch]);
  return <ProductCard product={MOCK_PRODUCT} />;
}

export const Wishlisted: Story = {
  name: 'Wishlisted — heart filled (wishlistSlice)',
  args: { product: MOCK_PRODUCT },
  render: () => (
    <div style={{ width: 280 }}>
      <WishlistedCard />
    </div>
  ),
};
