import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GenericSliderBlock } from '../app/components/blocks/GenericSliderBlock';

const meta = {
  title: 'Components / GenericSliderBlock',
  component: GenericSliderBlock,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof GenericSliderBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Semantic (hp_b_b_*) attribute helpers ───────────────────────────────────

function makeSemanticSlide(
  pic: string,
  lable: string,
  title: string,
  description: string,
  cta_text: string,
  cta_link: string,
  id?: number,
) {
  return {
    id,
    attributeValues: {
      hp_b_b_pic:         { value: [{ downloadLink: pic }] },
      hp_b_b_lable:       { value: lable },
      hp_b_b_title:       { value: title },
      hp_b_b_description: { value: description },
      hp_b_b_cta_text:    { value: cta_text },
      hp_b_b_cta_link:    { value: cta_link },
    },
  };
}

// ─── Positional (string_id* / image_id*) attribute helpers ──────────────────

function makePositionalSlide(
  headline: string,
  eyebrow: string,
  subtext: string,
  cta: string,
  href: string,
  imageUrl: string,
  id?: number,
) {
  return {
    id,
    attributeValues: {
      string_id1: { value: headline },
      string_id2: { value: eyebrow },
      string_id3: { value: subtext },
      image_id4:  { value: [{ downloadLink: imageUrl }] },
      string_id5: { value: cta },
      string_id6: { value: href },
    },
  };
}

// ─── Stories ─────────────────────────────────────────────────────────────────

/**
 * Three slides using `hp_b_b_*` semantic attribute names.
 * Prev / next arrow buttons and dot pagination are visible and interactive.
 */
export const MultipleSlides: Story = {
  args: {
    title: 'Seasonal Lookbook',
    slides: [
      makeSemanticSlide(
        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80',
        'New Collection',
        'Summer 2025',
        'Explore the season\'s most coveted pieces — curated for warmth, movement, and effortless style.',
        'Shop Women',
        '/catalog/women',
        1,
      ),
      makeSemanticSlide(
        'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=1600&q=80',
        'Editorial Pick',
        'Bold Silhouettes',
        'Strong shoulders, fluid fabrics — the power dressing revival is here.',
        'Explore Now',
        '/catalog/new-arrivals',
        2,
      ),
      makeSemanticSlide(
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1600&q=80',
        'Limited Drop',
        'Archive Essentials',
        'Timeless wardrobe anchors, reimagined for modern dressing.',
        'Shop Essentials',
        '/catalog/essentials',
        3,
      ),
    ],
  },
};

/**
 * Single slide — arrows and dot pagination are hidden per component logic
 * (`slides.length > 1` guard).
 */
export const SingleSlide: Story = {
  args: {
    title: 'Hero Banner',
    slides: [
      makeSemanticSlide(
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1600&q=80',
        'Exclusive',
        'The New Cashmere',
        'Ultra-fine fibres, uncompromising softness — from mountain pastures to your wardrobe.',
        'Discover More',
        '/catalog/cashmere',
        10,
      ),
    ],
  },
};

/**
 * Two slides using positional `string_id1`–`string_id6` + `image_id4` keys.
 * Verifies that the positional-fallback path in `normalizeSlide` resolves
 * correctly when no semantic attribute names are present.
 */
export const PositionalNaming: Story = {
  args: {
    title: 'Positional Fallback Demo',
    slides: [
      makePositionalSlide(
        'New Arrivals',
        'Just In',
        'Fresh styles landing every week — be the first to explore.',
        'Shop Now',
        '/catalog/new-arrivals',
        'https://images.unsplash.com/photo-1594938298603-c8148c4b4528?w=1600&q=80',
        20,
      ),
      makePositionalSlide(
        'Sale Picks',
        'Up to 40% Off',
        'Selected styles, reduced. While stocks last.',
        'Browse Sale',
        '/catalog/sale',
        'https://images.unsplash.com/photo-1765248148786-358026d6994d?w=1600&q=80',
        21,
      ),
    ],
  },
};

/**
 * Empty slides array — component returns null.
 * The canvas will be blank; this verifies the null-guard is in place.
 */
export const Empty: Story = {
  args: {
    title: 'Empty Slider',
    slides: [],
  },
};
