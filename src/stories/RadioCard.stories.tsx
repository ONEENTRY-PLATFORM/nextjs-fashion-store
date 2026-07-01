import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { RadioCard } from '../app/components/RadioCard';
import { Truck } from 'lucide-react';

const meta = {
  title: 'UI / RadioCard',
  component: RadioCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
  args: { onChange: fn() },
} satisfies Meta<typeof RadioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: {
    checked: false,
    icon: <Truck size={20} />,
    title: 'Standard Delivery',
    subtitle: '3–5 business days',
  },
};

export const Selected: Story = {
  args: {
    checked: true,
    icon: <Truck size={20} />,
    title: 'Standard Delivery',
    subtitle: '3–5 business days',
  },
};

export const SelectedWithChildren: Story = {
  name: 'Selected — with address form',
  args: {
    checked: true,
    icon: <Truck size={20} />,
    title: 'Home Delivery',
    subtitle: '1–2 business days',
    children: (
      <div className="pt-4 text-sm text-gray-500">
        <p className="font-semibold text-black">Sophie Martin</p>
        <p>12 Oxford Street, London W1D 1AB</p>
      </div>
    ),
  },
};
