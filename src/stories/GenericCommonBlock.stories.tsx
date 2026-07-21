import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GenericCommonBlock } from '../app/components/blocks/GenericCommonBlock';

const meta = {
  title: 'Components / GenericCommonBlock',
  component: GenericCommonBlock,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof GenericCommonBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** OE image attribute shape — array with downloadLink. */
const BANNER_IMAGE = [
  { downloadLink: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80' },
];

/**
 * Full banner matching the `discount_banner` attribute set naming convention:
 * hp_b_b_lable, hp_b_b_title, hp_b_b_sub_title, hp_b_b_description,
 * hp_b_b_pic, hp_b_b_cta_text, hp_b_b_cta_link.
 */
export const FullBanner: Story = {
  args: {
    title: 'Fallback Title',
    lang: 'en_US',
    attributeValues: {
      hp_b_b_lable:       { value: 'New Collection' },
      hp_b_b_title:       { value: 'Summer 2025' },
      hp_b_b_sub_title:   { value: 'Light fabrics, bold silhouettes' },
      hp_b_b_description: { value: 'Explore the season\'s most coveted pieces — curated for warmth, movement, and effortless style.' },
      hp_b_b_pic:         { value: BANNER_IMAGE },
      hp_b_b_cta_text:    { value: 'Shop the Collection' },
      hp_b_b_cta_link:    { value: '/catalog/women' },
    },
  },
};

/**
 * Text-only variant — no image. Content panel stretches full width and is
 * centred. Useful for editorial or campaign blocks without photography.
 */
export const TextOnly: Story = {
  args: {
    title: 'Fallback Title',
    lang: 'en_US',
    attributeValues: {
      hp_b_b_lable:       { value: 'Limited Offer' },
      hp_b_b_title:       { value: 'Up to 40% Off' },
      hp_b_b_sub_title:   { value: 'This weekend only' },
      hp_b_b_description: { value: 'Use code SUMMER40 at checkout. Selected styles, while stocks last.' },
      hp_b_b_cta_text:    { value: 'Browse Sale' },
      hp_b_b_cta_link:    { value: '/catalog/sale' },
    },
  },
};

/**
 * Minimal headline — only the title attribute is provided.
 * Verifies the component renders without crashing when most attrs are absent.
 */
export const MinimalHeadline: Story = {
  args: {
    title: 'Fallback Title',
    lang: 'en_US',
    attributeValues: {
      hp_b_b_title: { value: 'New Arrivals' },
    },
  },
};

/**
 * Empty — no attributes set, no fallback headline resolved.
 * The component returns null, so nothing is visible in the canvas.
 */
export const Empty: Story = {
  args: {
    title: '',
    lang: 'en_US',
    attributeValues: {},
  },
};
