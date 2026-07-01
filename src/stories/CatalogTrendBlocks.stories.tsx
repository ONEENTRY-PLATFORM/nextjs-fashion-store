import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CatalogTrendBlocks } from '../app/components/CatalogTrendBlocks';
import type { TrendBlock } from '../app/components/CatalogTemplate';

const SAMPLE_TRENDS: TrendBlock[] = [
  {
    label: 'Minimalist',
    image:
      'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    tag: 'NEW',
  },
  {
    label: 'Boho Chic',
    image:
      'https://images.unsplash.com/photo-1728485299033-a3b6e98cb5b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  },
  {
    label: 'Street Style',
    image:
      'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    tag: 'TRENDING',
  },
  {
    label: 'Classic Edit',
    image:
      'https://images.unsplash.com/photo-1685953851497-9b67b25f0ed7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  },
];

const meta = {
  title: 'Sections / CatalogTrendBlocks',
  component: CatalogTrendBlocks,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof CatalogTrendBlocks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { trendBlocks: SAMPLE_TRENDS },
};

export const TwoItems: Story = {
  args: { trendBlocks: SAMPLE_TRENDS.slice(0, 2) },
};
