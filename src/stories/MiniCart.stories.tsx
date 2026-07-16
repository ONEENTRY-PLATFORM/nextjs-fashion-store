'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MiniCart } from '../app/components/MiniCart';
import { useAppDispatch } from '../app/store/hooks';
import { cartActions } from '../app/store/cartSlice';
import { MOCK_CART_ITEM, MOCK_CART_ITEM_SALE } from './mockData';

/** Wrapper that opens MiniCart with items pre-loaded.
 *
 * Rendering notes:
 * - Line items render `item.price` (sale price) with `item.originalPrice`
 *   struck through below it — classic sale strike-through UX, same as
 *   catalog / PDP (e.g. MOCK_CART_ITEM_SALE: $65 × 2 = $130 shown, $89 × 2
 *   struck through).
 * - Subtotal row = sum of `item.price` across all items.
 * - No "Sale" or "Items discount" row in the footer.
 * - Total row equals `subtotal` when no OE discount applies; switches to
 *   `totalDue` (OE) when `personalDiscount > 0 || couponDiscount > 0 || bonusBurned`.
 */
function OpenWithItems() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartActions.addItem(MOCK_CART_ITEM));
    dispatch(cartActions.addItem(MOCK_CART_ITEM_SALE));
    dispatch(cartActions.openMiniCart());
  }, [dispatch]);
  return <MiniCart />;
}

/** Wrapper that opens MiniCart empty */
function OpenEmpty() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartActions.openMiniCart());
  }, [dispatch]);
  return <MiniCart />;
}

const meta = {
  title: 'Components / MiniCart',
  component: MiniCart,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof MiniCart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {
  name: 'Open — 2 items (1 on sale, strike-through UX)',
  render: () => <OpenWithItems />,
};

export const Empty: Story = {
  name: 'Open — empty cart',
  render: () => <OpenEmpty />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <MiniCart />,
};
