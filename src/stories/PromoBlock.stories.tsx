import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PromoBlock } from '../app/components/PromoBlock';

const meta = {
  title: 'Sections / PromoBlock',
  component: PromoBlock,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof PromoBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * PromoBlock loads items via RTK Query (homepageApi → fakeBaseQuery → PROMO_ITEMS).
 * Works out-of-the-box with the global Redux store decorator.
 */
export const Default: Story = {};
