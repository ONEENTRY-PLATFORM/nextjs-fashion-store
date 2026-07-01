import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { JsonLd } from '../app/components/JsonLd';

const meta = {
  title: 'UI / JsonLd',
  component: JsonLd,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof JsonLd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Product: Story = {
  name: 'Product schema',
  args: {
    data: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Satin Slip Midi Dress',
      brand: { '@type': 'Brand', name: 'Reformation' },
      offers: {
        '@type': 'Offer',
        price: '89.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
  },
};

export const BreadcrumbList: Story = {
  name: 'BreadcrumbList schema',
  args: {
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Women', item: '/women' },
        { '@type': 'ListItem', position: 3, name: 'Clothing', item: '/women/clothing' },
      ],
    },
  },
};
