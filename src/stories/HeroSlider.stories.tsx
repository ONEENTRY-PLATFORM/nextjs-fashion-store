import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HeroSlider } from '@/app/components/home/HeroSlider';

const meta = {
  title: 'Sections / HeroSlider',
  component: HeroSlider,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** HeroSlider loads slides via RTK Query (homepageApi). */
export const Default: Story = {};
