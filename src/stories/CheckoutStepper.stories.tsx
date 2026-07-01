import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CheckoutStepper } from '../app/components/CheckoutStepper';

const meta = {
  title: 'UI / CheckoutStepper',
  component: CheckoutStepper,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: { type: 'range', min: 0, max: 3, step: 1 },
      description: '0 = Cart, 1 = Delivery, 2 = Payment, 3 = Confirmation',
    },
  },
} satisfies Meta<typeof CheckoutStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cart: Story = {
  args: { currentStep: 0 },
};

export const Delivery: Story = {
  args: { currentStep: 1 },
};

export const Payment: Story = {
  args: { currentStep: 2 },
};

export const Confirmation: Story = {
  args: { currentStep: 3 },
};
