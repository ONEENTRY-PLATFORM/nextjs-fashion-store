import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Footer } from '../app/components/Footer';

const meta = {
  title: 'Layout / Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
