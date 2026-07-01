import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImageWithFallback } from '../app/components/ImageWithFallback';

const meta = {
  title: 'UI / ImageWithFallback',
  component: ImageWithFallback,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 240, height: 300, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageWithFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    alt: 'Satin Slip Midi Dress',
    fill: true,
    sizes: '240px',
    style: { objectFit: 'cover', objectPosition: 'top' },
  },
};

export const BrokenUrl: Story = {
  name: 'Broken URL → shows fallback bag icon',
  args: {
    src: '/non-existent-image-404.jpg',
    alt: 'Product image',
    fill: true,
    sizes: '240px',
  },
};

export const Grayscale: Story = {
  name: 'Grayscale (out-of-stock style)',
  args: {
    src: '/non-existent-image-404.jpg',
    alt: 'Product image',
    fill: true,
    sizes: '240px',
    grayscale: true,
  },
};
