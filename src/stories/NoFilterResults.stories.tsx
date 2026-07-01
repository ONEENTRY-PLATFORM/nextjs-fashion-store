import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { NoFilterResults } from '../app/components/NoFilterResults';

const meta = {
  title: 'UI / NoFilterResults',
  component: NoFilterResults,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { onClearAll: fn() },
} satisfies Meta<typeof NoFilterResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
