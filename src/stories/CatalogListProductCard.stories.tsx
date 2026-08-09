import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CatalogListProductCard } from '../app/components/catalog/CatalogListProductCard';
import { ACCENT_MEN, ACCENT_WOMEN } from '../app/constants/colors';
import { MOCK_OOS_PRODUCT, MOCK_PRODUCT, MOCK_SALE_PRODUCT } from './mockData';

const meta = {
  title: 'Components / CatalogListProductCard',
  component: CatalogListProductCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 680 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CatalogListProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { product: MOCK_PRODUCT, accent: ACCENT_WOMEN },
};

export const SaleItem: Story = {
  args: { product: MOCK_SALE_PRODUCT, accent: ACCENT_WOMEN },
};

export const MenAccent: Story = {
  args: { product: MOCK_PRODUCT, accent: ACCENT_MEN },
};

export const List: Story = {
  name: 'List of 3 items',
  args: { product: MOCK_PRODUCT, accent: ACCENT_WOMEN },
  render: () => (
    <div style={{ maxWidth: 680 }}>
      <CatalogListProductCard product={MOCK_PRODUCT} accent={ACCENT_WOMEN} />
      <CatalogListProductCard product={MOCK_SALE_PRODUCT} accent={ACCENT_WOMEN} />
      <CatalogListProductCard product={MOCK_OOS_PRODUCT} accent={ACCENT_WOMEN} />
    </div>
  ),
};
