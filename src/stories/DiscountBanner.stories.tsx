import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DiscountBanner } from '../app/components/DiscountBanner';

const meta = {
  title: 'Sections / DiscountBanner',
  component: DiscountBanner,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof DiscountBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * DiscountBanner loads data via RTK Query (homepageApi → fakeBaseQuery → DISCOUNT_BANNER).
 * Works out-of-the-box with the global Redux store decorator.
 */
export const Default: Story = {};
