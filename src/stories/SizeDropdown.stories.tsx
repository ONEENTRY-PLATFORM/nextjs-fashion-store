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
    availableSizes: { control: 'object' },
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

export const AvailableSizesEmpty: Story = {
  args: { value: 'M', isShoe: false, availableSizes: [] },
  parameters: {
    docs: {
      description: {
        story: 'When `availableSizes` is an empty array the widget renders nothing (hidden).',
      },
    },
  },
};

export const AvailableSizesSingle: Story = {
  args: { value: 'M', isShoe: false, availableSizes: ['M'] },
  parameters: {
    docs: {
      description: {
        story: 'When only one size is available the component renders a static badge without dropdown affordance.',
      },
    },
  },
};

export const AvailableSizesMulti: Story = {
  args: { value: 'M', isShoe: false, availableSizes: ['S', 'M', 'L'] },
  parameters: {
    docs: {
      description: {
        story: 'When multiple sizes are provided the component renders a dropdown with exactly those options.',
      },
    },
  },
};

export const AvailableSizesShoes: Story = {
  args: { value: '40', isShoe: true, availableSizes: ['39', '40', '41', '42'] },
  parameters: {
    docs: {
      description: {
        story: 'Shoes variant with an explicit set of available sizes.',
      },
    },
  },
};
