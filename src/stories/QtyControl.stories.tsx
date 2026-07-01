import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { QtyControl } from '../app/components/QtyControl';

const meta = {
  title: 'UI / QtyControl',
  component: QtyControl,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
  },
  args: {
    onMinus: fn(),
    onPlus: fn(),
  },
} satisfies Meta<typeof QtyControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {
  args: { value: 1, size: 'md' },
};

export const Small: Story = {
  args: { value: 1, size: 'sm' },
};

export const HighQuantity: Story = {
  args: { value: 99, size: 'md' },
};

export const AtMinimum: Story = {
  name: 'At Minimum (disabled minus)',
  args: { value: 1, size: 'md' },
};
