import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Header } from '../app/components/Header';

const meta = {
  title: 'Layout / Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    // Storybook nextjs mocks useRouter/usePathname, so navigation works
    nextjs: {
      navigation: {
        pathname: '/women',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Women: Story = {
  name: 'Women section (default)',
  parameters: {
    nextjs: { navigation: { pathname: '/women' } },
  },
};

export const Men: Story = {
  name: 'Men section',
  parameters: {
    nextjs: { navigation: { pathname: '/men' } },
  },
};

export const HomePage: Story = {
  name: 'Home page',
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
  },
};

export const SalePage: Story = {
  name: 'Sale page',
  parameters: {
    nextjs: { navigation: { pathname: '/sale' } },
  },
};
