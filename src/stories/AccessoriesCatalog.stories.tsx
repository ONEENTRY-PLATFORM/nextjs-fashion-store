import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AccessoriesCatalog } from '../app/components/AccessoriesCatalog';
import type { FilterGroup, TrendBlock } from '../app/components/AccessoriesCatalog';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT } from './mockData';
import { ACCENT_WOMEN, ACCENT_MEN } from '../app/constants/colors';

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: 'Type',
    key: 'accessoryType',
    type: 'checkbox',
    options: [
      { label: 'Scarves/Shawls', count: 8 },
      { label: 'Jewelry', count: 14 },
      { label: 'Sunglasses', count: 6 },
      { label: 'Headwear', count: 5 },
    ],
  },
  {
    label: 'Material',
    key: 'material',
    type: 'checkbox',
    options: [
      { label: 'Silk', count: 7 },
      { label: 'Leather', count: 9 },
      { label: 'Gold', count: 5 },
    ],
  },
];

const TREND_BLOCKS: TrendBlock[] = [
  {
    label: 'Summer Scarves',
    image: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    tag: 'NEW',
  },
  {
    label: 'Fine Jewelry',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  },
  {
    label: 'Oversized Shades',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    tag: 'TRENDING',
  },
  {
    label: 'Straw Hats',
    image: 'https://images.unsplash.com/photo-1522057384400-681b421b7d0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  },
];

const meta = {
  title: 'Templates / AccessoriesCatalog',
  component: AccessoriesCatalog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof AccessoriesCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WomenAccessories: Story = {
  name: 'Women — Accessories catalog',
  args: {
    catalogKey: 'story-women-accessories',
    gender: 'women',
    accentColor: ACCENT_WOMEN,
    totalStyles: 3,
    quickChips: ['All', 'Scarves', 'Jewelry', 'Sunglasses'],
    filterGroups: FILTER_GROUPS,
    products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
    trendBlocks: TREND_BLOCKS,
  },
};

export const MenAccessories: Story = {
  name: 'Men — Accessories catalog',
  args: {
    catalogKey: 'story-men-accessories',
    gender: 'men',
    accentColor: ACCENT_MEN,
    totalStyles: 3,
    quickChips: ['All', 'Belts', 'Wallets', 'Caps'],
    filterGroups: FILTER_GROUPS,
    products: [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT],
    trendBlocks: TREND_BLOCKS,
  },
};
