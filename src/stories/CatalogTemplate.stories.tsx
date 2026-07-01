import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CatalogTemplate } from '../app/components/CatalogTemplate';
import type { FilterGroup, ChipFilter } from '../app/components/CatalogTemplate';
import { MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT } from './mockData';
import { ACCENT_WOMEN, ACCENT_MEN } from '../app/constants/colors';

const SAMPLE_FILTER_GROUPS: FilterGroup[] = [
  {
    label: 'Type',
    key: 'clothingType',
    type: 'checkbox',
    options: [
      { label: 'Dresses', count: 2 },
      { label: 'Tops', count: 1 },
    ],
  },
  {
    label: 'Color',
    key: 'colors',
    type: 'color',
    options: [
      { label: 'Black', count: 2, color: '#000000' },
      { label: 'Beige', count: 1, color: '#C4A882' },
    ],
  },
  {
    label: 'Price',
    key: 'price',
    type: 'price_range',
    rangeMin: 0,
    rangeMax: 200,
    rangeStep: 10,
    rangeUnit: '$',
    options: [],
  },
];

const SAMPLE_QUICK_CHIPS: ChipFilter[] = [
  { chip: 'All', filter: () => true },
  { chip: 'Dresses', filter: (p) => p.clothingType === 'Dresses' },
  { chip: 'On Sale', filter: (p) => !!p.salePrice },
];

const SAMPLE_PRODUCTS = [MOCK_PRODUCT, MOCK_SALE_PRODUCT, MOCK_OOS_PRODUCT];

const meta = {
  title: 'Templates / CatalogTemplate',
  component: CatalogTemplate,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof CatalogTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WomenClothing: Story = {
  name: 'Women — Clothing catalog',
  args: {
    catalogKey: 'story-women-clothing',
    products: SAMPLE_PRODUCTS,
    filterGroups: SAMPLE_FILTER_GROUPS,
    quickChips: SAMPLE_QUICK_CHIPS,
    accentColor: ACCENT_WOMEN,
    title: 'CLOTHING',
    genderLabel: 'WOMEN',
    totalStyles: 3,
    productsPerPage: 12,
    breadcrumbs: [
      { label: 'WOMEN', href: '/women/clothing' },
      { label: 'Clothing' },
    ],
  },
};

export const MenClothing: Story = {
  name: 'Men — Clothing catalog',
  args: {
    catalogKey: 'story-men-clothing',
    products: SAMPLE_PRODUCTS,
    filterGroups: SAMPLE_FILTER_GROUPS,
    quickChips: SAMPLE_QUICK_CHIPS,
    accentColor: ACCENT_MEN,
    title: 'CLOTHING',
    genderLabel: 'MEN',
    totalStyles: 3,
    productsPerPage: 12,
    breadcrumbs: [
      { label: 'MEN', href: '/men/clothing' },
      { label: 'Clothing' },
    ],
  },
};
