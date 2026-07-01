'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MiniCart } from '../app/components/MiniCart';
import { useAppDispatch } from '../app/store/hooks';
import { cartActions } from '../app/store/cartSlice';
import { MOCK_CART_ITEM, MOCK_CART_ITEM_SALE } from './mockData';

/** Wrapper that opens MiniCart with items pre-loaded */
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
  name: 'Open — 2 items (1 sale)',
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
