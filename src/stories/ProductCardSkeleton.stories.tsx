import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProductCardSkeleton } from '../app/components/ProductCardSkeleton';

const meta = {
  title: 'UI / ProductCardSkeleton',
  component: ProductCardSkeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 260 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4" style={{ width: 800 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  ),
};
