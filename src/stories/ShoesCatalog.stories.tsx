import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShoesCatalog } from '../app/components/ShoesCatalog';
import type { FilterGroup } from '../app/components/ShoesCatalog';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT } from './mockData';
import { ACCENT_WOMEN, ACCENT_MEN } from '../app/constants/colors';

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: 'Type',
    key: 'shoeType',
    type: 'checkbox',
    options: [
      { label: 'Sneakers', count: 12 },
      { label: 'Boots', count: 8 },
      { label: 'Sandals', count: 6 },
    ],
  },
  {
    label: 'Size',
    key: 'sizes',
    type: 'size_chips',
    options: [
      { label: '36', count: 0 }, { label: '37', count: 0 }, { label: '38', count: 0 }, { label: '39', count: 0 }, { label: '40', count: 0 },
    ],
  },
];

const meta = {
  title: 'Templates / ShoesCatalog',
  component: ShoesCatalog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ShoesCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WomenShoes: Story = {
  name: 'Women — Shoes catalog',
  args: {
    catalogKey: 'story-women-shoes',
    gender: 'women',
    accentColor: ACCENT_WOMEN,
    totalStyles: 3,
    quickChips: ['All', 'Sneakers', 'Boots', 'Sandals'],
    filterGroups: FILTER_GROUPS,
    products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
  },
};

export const MenShoes: Story = {
  name: 'Men — Shoes catalog',
  args: {
    catalogKey: 'story-men-shoes',
    gender: 'men',
    accentColor: ACCENT_MEN,
    totalStyles: 3,
    quickChips: ['All', 'Sneakers', 'Boots'],
    filterGroups: FILTER_GROUPS,
    products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
  },
};
