import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CategorySection } from '../app/components/CategorySection';

const meta = {
  title: 'Sections / CategorySection',
  component: CategorySection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof CategorySection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * CategorySection loads data via RTK Query (catalogConfigApi → fakeBaseQuery → SHOP_CATEGORIES).
 * Works out-of-the-box with the global Redux store decorator.
 * Shows 6-column category grid with filter chips.
 */
export const Default: Story = {};
