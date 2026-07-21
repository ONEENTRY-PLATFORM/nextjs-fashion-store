/// <reference types="@testing-library/jest-dom" />
/**
 * GenericCommonBlock — unit tests.
 *
 * Covers the heuristic attribute extraction logic:
 *  1. Flat attributeValues with OE discount_banner-style keys.
 *  2. Image rendered via <img> when hp_b_b_pic provides a downloadLink.
 *  3. CTA <a> present when both cta_text + cta_link are set; absent otherwise.
 *  4. Falls back to the `title` prop when no attribute matches the title pattern.
 *  5. Returns null when no image AND no headline/text is configured.
 *  6. Wrapped attribute shape ({ en_US: { key: { value } } }) flattened correctly.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/image → plain <img> so we can assert on src/alt without loader magic.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt ?? ''} data-testid="banner-img" {...rest} />
  ),
}));

// next/link → plain <a>.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} data-testid="banner-cta" {...rest}>
      {children}
    </a>
  ),
}));

// lucide-react ChevronRight — not needed for behaviour assertions.
vi.mock('lucide-react', () => ({
  ChevronRight: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a flat attributeValues map using OE discount_banner-style keys. */
function flatAttrs(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return overrides;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenericCommonBlock — flat attribute shape', () => {
  it('renders label, title, subtitle, and description when matching keys are present', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Fallback Title"
        attributeValues={flatAttrs({
          hp_b_b_lable:       { value: 'EYEBROW TEXT' },
          hp_b_b_title:       { value: 'Main Heading' },
          hp_b_b_sub_title:   { value: 'Supporting Line' },
          hp_b_b_description: { value: 'Body copy here.' },
        })}
      />,
    );

    expect(screen.getByText('EYEBROW TEXT')).toBeTruthy();
    expect(screen.getByText('Main Heading')).toBeTruthy();
    expect(screen.getByText('Supporting Line')).toBeTruthy();
    expect(screen.getByText('Body copy here.')).toBeTruthy();
  });

  it('renders an <img> when hp_b_b_pic provides a downloadLink', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Banner"
        attributeValues={flatAttrs({
          hp_b_b_title: { value: 'Banner Title' },
          hp_b_b_pic:   { value: [{ downloadLink: 'https://cdn.example.com/banner.jpg' }] },
        })}
      />,
    );

    const img = screen.getByTestId('banner-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('banner.jpg');
  });

  it('renders CTA <a> when both cta_text and cta_link are set', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Banner"
        attributeValues={flatAttrs({
          hp_b_b_title:    { value: 'Shop Now Banner' },
          hp_b_b_cta_text: { value: 'Shop Now' },
          hp_b_b_cta_link: { value: '/shop/all' },
        })}
      />,
    );

    const cta = screen.getByTestId('banner-cta') as HTMLAnchorElement;
    expect(cta).toBeTruthy();
    expect(cta.href).toContain('/shop/all');
    expect(cta.textContent).toContain('Shop Now');
  });

  it('hides CTA when only cta_text is present (no cta_link)', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Banner"
        attributeValues={flatAttrs({
          hp_b_b_title:    { value: 'No Link Banner' },
          hp_b_b_cta_text: { value: 'Click Me' },
          // hp_b_b_cta_link intentionally absent
        })}
      />,
    );

    expect(screen.queryByTestId('banner-cta')).toBeNull();
  });

  it('hides CTA when only cta_link is present (no cta_text)', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Banner"
        attributeValues={flatAttrs({
          hp_b_b_title:    { value: 'No Text Banner' },
          hp_b_b_cta_link: { value: '/shop/all' },
          // hp_b_b_cta_text intentionally absent
        })}
      />,
    );

    expect(screen.queryByTestId('banner-cta')).toBeNull();
  });

  it('falls back to the title prop when no attribute matches the title pattern', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Prop Fallback Title"
        // attributeValues has no *_title key
        attributeValues={flatAttrs({
          hp_b_b_description: { value: 'Some body text.' },
        })}
      />,
    );

    expect(screen.getByText('Prop Fallback Title')).toBeTruthy();
  });

  it('returns null when no image AND no title/subtitle/description is configured', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    const { container } = render(
      <GenericCommonBlock
        title=""
        // No attributes that produce any visible content
        attributeValues={flatAttrs({})}
      />,
    );

    // The component returns null → nothing mounted under the container root.
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('GenericCommonBlock — wrapped attribute shape', () => {
  it('flattens { en_US: { key: { value } } } and renders the same output as the flat shape', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Fallback"
        lang="en_US"
        attributeValues={{
          en_US: {
            hp_b_b_title:     { value: 'Wrapped Title' },
            hp_b_b_sub_title: { value: 'Wrapped Subtitle' },
          },
        }}
      />,
    );

    expect(screen.getByText('Wrapped Title')).toBeTruthy();
    expect(screen.getByText('Wrapped Subtitle')).toBeTruthy();
  });

  it('renders an image from the wrapped shape', async () => {
    const { GenericCommonBlock } = await import('./GenericCommonBlock');

    render(
      <GenericCommonBlock
        title="Wrapped"
        lang="en_US"
        attributeValues={{
          en_US: {
            hp_b_b_title: { value: 'Wrapped Banner' },
            hp_b_b_pic:   { value: [{ downloadLink: 'https://cdn.example.com/wrapped.jpg' }] },
          },
        }}
      />,
    );

    const img = screen.getByTestId('banner-img') as HTMLImageElement;
    expect(img.src).toContain('wrapped.jpg');
  });
});
