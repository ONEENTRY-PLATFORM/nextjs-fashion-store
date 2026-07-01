import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NewArrivals } from '../app/components/NewArrivals';

const meta = {
  title: 'Sections / NewArrivals',
  component: NewArrivals,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof NewArrivals>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * NewArrivals loads products via RTK Query (homepageApi → fakeBaseQuery → SALE_PRODUCTS).
 * Renders a horizontally scrollable product carousel.
 */
export const Default: Story = {};
