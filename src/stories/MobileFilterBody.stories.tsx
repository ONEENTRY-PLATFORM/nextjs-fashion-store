import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FilterBody, CheckboxUI } from '../app/components/MobileFilterBody';
import type { MobileFilterGroup } from '../app/components/MobileFilterPanel';

const CHECKBOX_GROUP: MobileFilterGroup = {
  label: 'Type',
  key: 'clothingType',
  type: 'checkbox',
  options: [
    { label: 'Dresses', count: 24 },
    { label: 'Tops', count: 18 },
    { label: 'Trousers', count: 15 },
    { label: 'Skirts', count: 11 },
  ],
};

const SIZE_GROUP: MobileFilterGroup = {
  label: 'Size',
  key: 'sizes',
  type: 'size_chips',
  options: [
    { label: 'XS' }, { label: 'S' }, { label: 'M' }, { label: 'L' }, { label: 'XL' },
  ],
};

const COLOR_GROUP: MobileFilterGroup = {
  label: 'Color',
  key: 'colors',
  type: 'color',
  options: [
    { label: 'Black', color: '#000000' },
    { label: 'White', color: '#FFFFFF' },
    { label: 'Beige', color: '#C4A882' },
    { label: 'Red', color: '#8B0000' },
  ],
};

const SEARCH_GROUP: MobileFilterGroup = {
  label: 'Brand',
  key: 'brand',
  type: 'search_checkbox',
  options: [
    { label: 'Reformation', count: 12 },
    { label: 'COS', count: 9 },
    { label: 'Toteme', count: 7 },
    { label: '& Other Stories', count: 15 },
    { label: 'Arket', count: 6 },
  ],
};

// ─── FilterBody ──────────────────────────────────────────────────────────────

const filterBodyMeta = {
  title: 'UI / MobileFilterBody / FilterBody',
  component: FilterBody,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ width: 340, border: '1px solid #e5e7eb' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    selectedFilters: {},
    onToggleFilter: fn(),
  },
} satisfies Meta<typeof FilterBody>;

export default filterBodyMeta;
type Story = StoryObj<typeof filterBodyMeta>;

export const CheckboxType: Story = {
  args: { group: CHECKBOX_GROUP },
};

export const SizeChips: Story = {
  args: { group: SIZE_GROUP },
};

export const Colors: Story = {
  args: { group: COLOR_GROUP },
};

export const SearchCheckbox: Story = {
  args: { group: SEARCH_GROUP },
};

export const WithSelections: Story = {
  args: {
    group: CHECKBOX_GROUP,
    selectedFilters: { clothingType: ['Dresses', 'Tops'] },
  },
};
