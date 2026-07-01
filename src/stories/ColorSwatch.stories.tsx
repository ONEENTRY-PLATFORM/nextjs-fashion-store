import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ColorSwatch } from '../app/components/ColorSwatch';

const meta = {
  title: 'UI / ColorSwatch',
  component: ColorSwatch,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'color' },
    size: { control: { type: 'range', min: 10, max: 40, step: 2 } },
  },
} satisfies Meta<typeof ColorSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { color: '#000000', selected: false, size: 14 },
};

export const Selected: Story = {
  args: { color: '#000000', selected: true, size: 14 },
};

export const White: Story = {
  args: { color: '#FFFFFF', selected: false, size: 14 },
};

export const WhiteSelected: Story = {
  args: { color: '#FFFFFF', selected: true, size: 14 },
};

export const Multi: Story = {
  args: { color: 'multi', selected: false, size: 14 },
};

export const Large: Story = {
  args: { color: '#F88A8A', selected: true, size: 24 },
};

export const AllWomenColors: Story = {
  args: { color: '#000000', selected: false },
  render: () => (
    <div className="flex gap-3 flex-wrap">
      {['#000000', '#FFFFFF', '#C4A882', '#A0A0A0', '#8B0000', '#556B2F', '#F88A8A', 'multi'].map(
        (c, i) => (
          <ColorSwatch key={c} color={c} selected={i === 0} size={18} />
        )
      )}
    </div>
  ),
};
