import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CatalogMobileSort } from '../app/components/CatalogMobileSort';

const meta = {
  title: 'Components / CatalogMobileSort',
  component: CatalogMobileSort,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onSortChange: fn(),
  },
} satisfies Meta<typeof CatalogMobileSort>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open — sort sheet',
  args: {
    isOpen: true,
    sortBy: 'featured',
  },
};

export const OpenWithSelection: Story = {
  name: 'Open — "Price: Low to High" selected',
  args: {
    isOpen: true,
    sortBy: 'price_asc',
  },
};

export const Closed: Story = {
  args: { isOpen: false, sortBy: 'featured' },
};
