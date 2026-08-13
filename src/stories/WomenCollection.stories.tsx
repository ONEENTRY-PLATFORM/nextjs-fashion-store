import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WomenCollection } from '@/app/components/home/WomenCollection';

const meta = {
  title: 'Sections / WomenCollection',
  component: WomenCollection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof WomenCollection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** WomenCollection loads products via RTK Query (homepageApi → fakeBaseQuery → NEW_ARRIVALS). */
export const Default: Story = {};
