/// <reference types="@testing-library/jest-dom" />
/**
 * GenericSliderBlock — unit tests.
 *
 * Covers:
 *  1. Semantic attribute keys (hp_b_b_title, hp_b_b_lable, hp_b_b_description,
 *     hp_b_b_pic, hp_b_b_cta_text, hp_b_b_cta_link) render correctly.
 *  2. Positional fallback keys (string_id1..6, image_id4).
 *  3. Single slide → prev/next buttons and dot pagination are NOT rendered.
 *  4. Multiple slides → prev/next visible; clicking Next advances the slide.
 *  5. Empty slides prop → component returns null.
 *  6. Slides without image AND without headline are filtered out.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/image → plain <img> so src/alt are assertable without Next.js loader.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    priority: _priority,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt ?? ''} data-testid="slide-img" {...rest} />
  ),
}));

// next/link → plain <a>.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} data-testid="slide-cta" {...rest}>
      {children}
    </a>
  ),
}));

// lucide-react — icons don't affect behaviour assertions.
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-left" />,
  ChevronRight: () => <span data-testid="icon-right" />,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Slide using semantic OE attribute keys (hp_b_b_* pattern). */
const semanticSlide = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  attributeValues: {
    hp_b_b_title:       { value: 'Semantic Headline' },
    hp_b_b_lable:       { value: 'Semantic Eyebrow' },
    hp_b_b_description: { value: 'Semantic subtext copy' },
    // extractImage receives `attr.value` — the array must be nested under `value`.
    hp_b_b_pic:         { value: [{ downloadLink: 'https://cdn.example.com/semantic.jpg' }] },
    hp_b_b_cta_text:    { value: 'Shop Now' },
    hp_b_b_cta_link:    { value: '/shop/all' },
    ...overrides,
  },
});

/** Slide using positional numeric keys (string_id1..6, image_id4). */
const positionalSlide = () => ({
  id: 2,
  attributeValues: {
    string_id1: { value: 'Positional Headline' },
    string_id2: { value: 'Positional Eyebrow' },
    string_id3: { value: 'Positional Subtext' },
    // pickPositional returns `attrs[key]?.value` — array must be under `.value`.
    image_id4:  { value: [{ downloadLink: 'https://cdn.example.com/positional.jpg' }] },
    string_id5: { value: 'Buy Now' },
    string_id6: { value: '/buy/now' },
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenericSliderBlock — semantic attribute keys', () => {
  it('renders headline, eyebrow, subtext and CTA from hp_b_b_* keys', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(<GenericSliderBlock slides={[semanticSlide()]} title="Hero" />);

    expect(screen.getByText('Semantic Headline')).toBeTruthy();
    expect(screen.getByText('Semantic Eyebrow')).toBeTruthy();
    expect(screen.getByText('Semantic subtext copy')).toBeTruthy();

    const cta = screen.getByTestId('slide-cta') as HTMLAnchorElement;
    expect(cta.textContent).toContain('Shop Now');
    expect(cta.href).toContain('/shop/all');
  });

  it('renders image with correct src from hp_b_b_pic array attribute', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(<GenericSliderBlock slides={[semanticSlide()]} />);

    const img = screen.getByTestId('slide-img') as HTMLImageElement;
    expect(img.src).toContain('semantic.jpg');
    expect(img.alt).toBe('Semantic Headline');
  });

  it('hides CTA when cta_text present but cta_link absent', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    const slide = semanticSlide();
    delete (slide.attributeValues as Record<string, unknown>).hp_b_b_cta_link;

    render(<GenericSliderBlock slides={[slide]} />);
    expect(screen.queryByTestId('slide-cta')).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('GenericSliderBlock — positional fallback keys', () => {
  it('renders headline, eyebrow, subtext and CTA from string_id*/image_id* keys', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(<GenericSliderBlock slides={[positionalSlide()]} title="Positional Slider" />);

    expect(screen.getByText('Positional Headline')).toBeTruthy();
    expect(screen.getByText('Positional Eyebrow')).toBeTruthy();
    expect(screen.getByText('Positional Subtext')).toBeTruthy();

    const cta = screen.getByTestId('slide-cta') as HTMLAnchorElement;
    expect(cta.textContent).toContain('Buy Now');
    expect(cta.href).toContain('/buy/now');
  });

  it('renders image from image_id4 positional key', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(<GenericSliderBlock slides={[positionalSlide()]} />);

    const img = screen.getByTestId('slide-img') as HTMLImageElement;
    expect(img.src).toContain('positional.jpg');
  });
});

// ---------------------------------------------------------------------------

describe('GenericSliderBlock — single-slide carousel controls', () => {
  it('hides prev/next buttons and dots when only one slide is present', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(<GenericSliderBlock slides={[semanticSlide()]} />);

    expect(screen.queryByRole('button', { name: /previous slide/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /next slide/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /go to slide/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('GenericSliderBlock — multi-slide navigation', () => {
  const makeSlide = (headline: string, index: number) => ({
    id: index,
    attributeValues: {
      hp_b_b_title: { value: headline },
      // No image — headline alone is enough to pass the filter.
    },
  });

  it('shows prev/next buttons and dot buttons when multiple slides are present', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(
      <GenericSliderBlock
        slides={[makeSlide('First Slide', 1), makeSlide('Second Slide', 2)]}
      />,
    );

    expect(screen.getByRole('button', { name: /previous slide/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /next slide/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /go to slide/i })).toHaveLength(2);
  });

  it('clicking Next advances to the next slide headline', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(
      <GenericSliderBlock
        slides={[
          makeSlide('First Slide', 1),
          makeSlide('Second Slide', 2),
          makeSlide('Third Slide', 3),
        ]}
      />,
    );

    // Initially, the first slide is visible.
    expect(screen.getByText('First Slide')).toBeTruthy();
    expect(screen.queryByText('Second Slide')).toBeNull();

    // Click next.
    fireEvent.click(screen.getByRole('button', { name: /next slide/i }));

    // Second slide is now visible, first is gone.
    expect(screen.getByText('Second Slide')).toBeTruthy();
    expect(screen.queryByText('First Slide')).toBeNull();
  });

  it('clicking Prev wraps around to the last slide from the first', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(
      <GenericSliderBlock
        slides={[makeSlide('Alpha', 1), makeSlide('Beta', 2), makeSlide('Gamma', 3)]}
      />,
    );

    // On the first slide. Click prev — should jump to the last.
    fireEvent.click(screen.getByRole('button', { name: /previous slide/i }));
    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.queryByText('Alpha')).toBeNull();
  });

  it('clicking a dot button navigates directly to that slide', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    render(
      <GenericSliderBlock
        slides={[makeSlide('Dot Slide A', 1), makeSlide('Dot Slide B', 2)]}
      />,
    );

    // Click "Go to slide 2" dot.
    fireEvent.click(screen.getByRole('button', { name: /go to slide 2/i }));
    expect(screen.getByText('Dot Slide B')).toBeTruthy();
    expect(screen.queryByText('Dot Slide A')).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('GenericSliderBlock — edge cases', () => {
  it('returns null when slides prop is an empty array', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    const { container } = render(<GenericSliderBlock slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when slides prop is undefined', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    const { container } = render(<GenericSliderBlock />);
    expect(container.firstChild).toBeNull();
  });

  it('filters out slides that have neither image nor headline', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    const validSlide = {
      id: 1,
      attributeValues: { hp_b_b_title: { value: 'Valid Slide' } },
    };
    // This slide has only a subtext — no image, no headline. Must be filtered.
    const invalidSlide = {
      id: 2,
      attributeValues: { hp_b_b_description: { value: 'Only subtext, no headline, no image' } },
    };

    render(<GenericSliderBlock slides={[invalidSlide, validSlide]} />);

    // Only the valid slide should render — no nav controls (single slide after filtering).
    expect(screen.getByText('Valid Slide')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /next slide/i })).toBeNull();
  });

  it('returns null when all slides fail the image-or-headline filter', async () => {
    const { GenericSliderBlock } = await import('./GenericSliderBlock');

    const { container } = render(
      <GenericSliderBlock
        slides={[
          { id: 1, attributeValues: { hp_b_b_description: { value: 'No image, no title' } } },
          { id: 2, attributeValues: {} },
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
