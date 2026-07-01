'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QuickViewModal } from '../app/components/QuickViewModal';
import { useAppDispatch } from '../app/store/hooks';
import { openQuickView } from '../app/store/uiSlice';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT } from './mockData';

function OpenQuickView({ product, initialColorIndex = null }: { product: typeof MOCK_PRODUCT; initialColorIndex?: number | null }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(openQuickView({ product, initialColorIndex: initialColorIndex ?? null }));
  }, [dispatch, product, initialColorIndex]);
  return <QuickViewModal />;
}

const meta = {
  title: 'Components / QuickViewModal',
  component: QuickViewModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof QuickViewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open — regular product',
  render: () => <OpenQuickView product={MOCK_PRODUCT} />,
};

export const OpenSale: Story = {
  name: 'Open — sale product',
  render: () => <OpenQuickView product={MOCK_SALE_PRODUCT} />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <QuickViewModal />,
};
