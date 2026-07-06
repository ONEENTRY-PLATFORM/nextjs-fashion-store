import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PromoBlock } from '../app/components/PromoBlock';
import type { HomepageCollectionItem } from '../lib/oneentry/blocks/homepage-collections';

const meta = {
  title: 'Sections / PromoBlock',
  component: PromoBlock,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof PromoBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const MOCK_PROMO_ITEMS: HomepageCollectionItem[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80',
    title: 'Women Collection',
    subtitle: 'Spring / Summer 2025',
    buttonText: 'Shop Now',
    link: '/catalog/women',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=800&q=80',
    title: 'Men Collection',
    subtitle: 'New Arrivals',
    buttonText: 'Explore',
    link: '/catalog/men',
  },
];

/**
 * Default story — no `initialItems` passed.
 * The component returns null in this case (data comes from OneEntry at runtime).
 * Use `WithItems` to see the actual UI.
 */
export const Default: Story = {};

/**
 * Filled state: two promo cards rendered side by side.
 * This is the typical runtime appearance once OneEntry data is loaded.
 */
export const WithItems: Story = {
  args: {
    initialItems: MOCK_PROMO_ITEMS,
  },
};
