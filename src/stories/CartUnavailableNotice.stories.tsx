'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CartUnavailableNotice } from '../app/components/CartUnavailableNotice';
import { useAppDispatch } from '../app/store/hooks';
import { cartActions } from '../app/store/cartSlice';
import { MOCK_CART_ITEM, MOCK_CART_ITEM_SALE } from './mockData';

/** Seeds `state.cart.unavailableRemoved` with one item and renders the notice. */
function WithOneItem() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartActions.setUnavailableRemoved([MOCK_CART_ITEM]));
    return () => { dispatch(cartActions.dismissUnavailableRemoved()); };
  }, [dispatch]);
  return <CartUnavailableNotice />;
}

/** Seeds `state.cart.unavailableRemoved` with two items to verify plural summary. */
function WithMultipleItems() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartActions.setUnavailableRemoved([MOCK_CART_ITEM, MOCK_CART_ITEM_SALE]));
    return () => { dispatch(cartActions.dismissUnavailableRemoved()); };
  }, [dispatch]);
  return <CartUnavailableNotice />;
}

/** No unavailable items — component renders nothing (null). */
function EmptyState() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartActions.dismissUnavailableRemoved());
  }, [dispatch]);
  return (
    <div className="p-4 text-sm text-gray-400 italic">
      (nothing rendered — unavailableRemoved is empty)
    </div>
  );
}

const meta = {
  title: 'Components / CartUnavailableNotice',
  component: CartUnavailableNotice,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Fixed-position banner shown when items are auto-removed from the cart due to unavailability. ' +
          'The banner **self-dismisses after 5 s** — this is the expected production behaviour, not a story bug. ' +
          'Reload the story panel to see it again.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CartUnavailableNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleItem: Story = {
  name: 'Banner — 1 removed item',
  render: () => <WithOneItem />,
};

export const MultipleItems: Story = {
  name: 'Banner — 2 removed items',
  render: () => <WithMultipleItems />,
};

export const Hidden: Story = {
  name: 'Hidden — empty unavailableRemoved',
  render: () => <EmptyState />,
};
