import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HeroSlider } from '../app/components/HeroSlider';

const meta = {
  title: 'Sections / HeroSlider',
  component: HeroSlider,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * HeroSlider loads slides via RTK Query (homepageApi).
 * The query uses fakeBaseQuery and returns HERO_SLIDES mock data,
 * so it works out-of-the-box with the Redux store decorator.
 */
export const Default: Story = {};
