import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CatalogCrossSell } from '../app/components/CatalogCrossSell';
import type { CrossSellCategory } from '../app/components/CatalogTemplate';

const SAMPLE_CATEGORIES: CrossSellCategory[] = [
  {
    label: 'Shoes',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    href: '/women/shoes',
  },
  {
    label: 'Bags',
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    href: '/women/bags',
  },
  {
    label: 'Accessories',
    image:
      'https://images.unsplash.com/photo-1611085583191-a3b181a88401?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    href: '/women/accessories',
  },
  {
    label: 'New Arrivals',
    image:
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    href: '/new',
  },
];

const meta = {
  title: 'Sections / CatalogCrossSell',
  component: CatalogCrossSell,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof CatalogCrossSell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    crossSell: {
      title: 'Complete Your Look',
      subtitle: 'You Might Also Like',
      href: '/women',
      categories: SAMPLE_CATEGORIES,
    },
  },
};
