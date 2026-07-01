import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FormField } from '../app/components/FormField';

const meta = {
  title: 'UI / FormField',
  component: FormField,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
  args: { onChange: fn() },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
    value: '',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
    value: 'test@example.com',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
    value: 'not-an-email',
    error: 'Enter a valid email address',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: '••••••••',
    type: 'password',
    value: '',
  },
};

export const PasswordError: Story = {
  args: {
    label: 'Password',
    placeholder: '••••••••',
    type: 'password',
    value: 'abc',
    error: 'Password must be at least 8 characters',
  },
};
