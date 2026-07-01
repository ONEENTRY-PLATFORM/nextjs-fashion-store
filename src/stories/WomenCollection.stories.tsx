import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WomenCollection } from '../app/components/WomenCollection';

const meta = {
  title: 'Sections / WomenCollection',
  component: WomenCollection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof WomenCollection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * WomenCollection loads products via RTK Query (homepageApi → fakeBaseQuery → NEW_ARRIVALS).
 * Renders a draggable horizontal product carousel with women's accent (#F88A8A).
 */
export const Default: Story = {};
