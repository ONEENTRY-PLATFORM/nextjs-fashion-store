import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SizeDropdown } from '../app/components/SizeDropdown';

const meta = {
  title: 'UI / SizeDropdown',
  component: SizeDropdown,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    isShoe: { control: 'boolean' },
  },
  args: { onChange: fn() },
} satisfies Meta<typeof SizeDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Clothing: Story = {
  args: { value: 'M', isShoe: false },
};

export const Shoes: Story = {
  args: { value: '39', isShoe: true },
};

export const OneSize: Story = {
  args: { value: 'One Size', isShoe: false },
};
