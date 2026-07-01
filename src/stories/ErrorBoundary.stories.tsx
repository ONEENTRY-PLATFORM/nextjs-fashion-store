import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ErrorBoundary } from '../app/components/ErrorBoundary';

/** Helper component that always throws on render */
function AlwaysThrows(): React.ReactNode {
  throw new Error('Simulated render error for story demonstration');
}

const meta = {
  title: 'UI / ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Triggered: Story = {
  name: 'Triggered — default error UI',
  args: { children: null },
  render: () => (
    <ErrorBoundary>
      <AlwaysThrows />
    </ErrorBoundary>
  ),
};

export const CustomFallback: Story = {
  name: 'Custom fallback slot',
  args: { children: null },
  render: () => (
    <ErrorBoundary
      fallback={
        <div className="p-8 border border-red-200 bg-red-50 text-center">
          <p className="text-sm text-red-600 font-semibold">
            Custom fallback — something went wrong.
          </p>
        </div>
      }
    >
      <AlwaysThrows />
    </ErrorBoundary>
  ),
};

export const HappyPath: Story = {
  name: 'Happy path — children render normally',
  args: { children: null },
  render: () => (
    <ErrorBoundary>
      <p className="text-sm text-gray-600 p-4">
        Children rendered without errors. ErrorBoundary is transparent.
      </p>
    </ErrorBoundary>
  ),
};
