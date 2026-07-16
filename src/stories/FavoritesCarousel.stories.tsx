import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FavoritesCarousel } from '../app/pages/favorites/FavoritesCarousel';

const meta = {
  title: 'Components / FavoritesCarousel',
  component: FavoritesCarousel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof FavoritesCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE_PRODUCTS = [
  {
    id: 'wc-1',
    name: 'Satin Slip Midi Dress',
    brand: 'Reformation',
    price: '$89.99',
    image:
      'https://images.unsplash.com/photo-1758900727942-531cea0c8186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    colors: ['#000000', '#C4A882', '#A0A0A0'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: 12,
  },
  {
    id: 'wc-2',
    name: 'Linen Wide-Leg Trousers',
    brand: 'COS',
    price: '$79.00',
    image:
      'https://images.unsplash.com/photo-1594938298603-c8148c4b4528?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    colors: ['#F5F5DC', '#808080'],
    sizes: ['XS', 'S', 'M', 'L'],
    stock: 5,
  },
  {
    id: 'wc-3',
    name: 'Wrap Mini Dress',
    brand: '& Other Stories',
    price: '$65.00',
    salePrice: '$45.50',
    image:
      'https://images.unsplash.com/photo-1765248148786-358026d6994d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    colors: ['#000000', '#8B0000', '#556B2F'],
    sizes: ['XS', 'S', 'M'],
    stock: 3,
  },
  {
    id: 'wc-4',
    name: 'Oversized Cashmere Sweater',
    brand: 'Toteme',
    price: '$320.00',
    image:
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    colors: ['#FFFFFF', '#000000', '#C4A882', '#8B0000'],
    sizes: ['S', 'M', 'L'],
    stock: 8,
  },
];

/** Default carousel — hover a card to reveal the Quick Add button. */
export const Default: Story = {
  args: {
    title: 'YOU MAY ALSO LIKE',
    products: BASE_PRODUCTS,
  },
};

/** Mix of regular and sale-priced items to verify price display. */
export const WithSaleItems: Story = {
  name: 'With sale items — strike-through price',
  args: {
    title: 'SIMILAR STYLES',
    products: BASE_PRODUCTS.filter((p) => p.salePrice || !p.salePrice),
  },
};

/** Products without optional `sizes` / `stock` fields — Quick Add still works
 *  but sends an empty size and no stockLimit. */
export const NoSizesOrStock: Story = {
  name: 'Without sizes / stock (optional fields omitted)',
  args: {
    title: 'RECENTLY VIEWED',
    products: BASE_PRODUCTS.map(({ sizes: _s, stock: _st, ...rest }) => rest),
  },
};

/** Single item — scroll arrows are visible but have nothing to scroll to. */
export const SingleItem: Story = {
  args: {
    title: 'COMPLETE THE LOOK',
    products: [BASE_PRODUCTS[0]],
  },
};
