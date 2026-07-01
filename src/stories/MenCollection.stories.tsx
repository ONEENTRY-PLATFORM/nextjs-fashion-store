import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MenCollection } from '../app/components/MenCollection';

const meta: Meta<typeof MenCollection> = {
  title: 'Sections / MenCollection',
  component: MenCollection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      // Override CatalogAccent to men's color for this section
      <Story />
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MenCollection>;

/** MenCollection now requires `products` passed by the homepage server route. */
export const Default: Story = { args: { products: [] } };
