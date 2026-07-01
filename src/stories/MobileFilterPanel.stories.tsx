import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { MobileFilterPanel } from '../app/components/MobileFilterPanel';
import type { MobileFilterGroup } from '../app/components/MobileFilterPanel';

const SAMPLE_FILTER_GROUPS: MobileFilterGroup[] = [
  {
    label: 'Type',
    key: 'clothingType',
    type: 'checkbox',
    options: [
      { label: 'Dresses', count: 24 },
      { label: 'Tops', count: 18 },
      { label: 'Trousers', count: 15 },
      { label: 'Skirts', count: 11 },
    ],
  },
  {
    label: 'Size',
    key: 'sizes',
    type: 'size_chips',
    options: [
      { label: 'XS' }, { label: 'S' }, { label: 'M' }, { label: 'L' }, { label: 'XL' },
    ],
  },
  {
    label: 'Color',
    key: 'colors',
    type: 'color',
    options: [
      { label: 'Black', color: '#000000' },
      { label: 'White', color: '#FFFFFF' },
      { label: 'Beige', color: '#C4A882' },
      { label: 'Red', color: '#8B0000' },
    ],
  },
];

const meta = {
  title: 'Components / MobileFilterPanel',
  component: MobileFilterPanel,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onToggleFilter: fn(),
    onClearAll: fn(),
    filterGroups: SAMPLE_FILTER_GROUPS,
    selectedFilters: {},
  },
} satisfies Meta<typeof MobileFilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { isOpen: true },
};

export const OpenWithSelections: Story = {
  name: 'Open — filters pre-selected',
  args: {
    isOpen: true,
    selectedFilters: {
      clothingType: ['Dresses'],
      sizes: ['S', 'M'],
    },
  },
};

export const Closed: Story = {
  args: { isOpen: false },
};
