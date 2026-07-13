import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---- Mock next/image --------------------------------------------------------
// jsdom has no image layout engine; next/image renders nothing useful there.
// Replace it with a plain <img> so we can query src/alt normally.
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', props),
}));

// ---- Mock FullscreenViewer --------------------------------------------------
// The viewer uses createPortal and key-listeners that do not initialise in
// jsdom. Stub it out — it is never rendered on the placeholder path anyway,
// and for the real-gallery case we only care that the placeholder is absent.
vi.mock('./FullscreenViewer', () => ({
  FullscreenViewer: () => null,
}));

// ---- Mock the label context hook --------------------------------------------
// ProductGallery calls useProductCardT which reads a React context.  Without a
// provider the hook falls back to the static string — that is fine for tests,
// but we mock the module to avoid pulling in React context machinery that might
// fail in isolation.
vi.mock('../../../lib/oneentry/labels/ProductCardLabelsContext', () => ({
  useProductCardT: (_key: string, fallback: string) => fallback,
}));

import { ProductGallery } from './ProductGallery';

// ---------------------------------------------------------------------------

describe('ProductGallery — placeholder (empty images)', () => {
  it('renders an image with bag-placeholder.svg src and the productName as alt when images=[]', () => {
    render(<ProductGallery images={[]} productName="Coat" />);

    const img = screen.getByRole('img', { name: 'Coat' });
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain('bag-placeholder.svg');
  });

  it('renders the placeholder when images contains only empty strings (filter drops them)', () => {
    render(<ProductGallery images={['', '']} productName="Jacket" />);

    const img = screen.getByRole('img', { name: 'Jacket' });
    expect((img as HTMLImageElement).src).toContain('bag-placeholder.svg');
  });
});

describe('ProductGallery — real gallery (non-empty images)', () => {
  it('does NOT render the placeholder when at least one real image is provided', () => {
    render(<ProductGallery images={['https://example.com/a.jpg']} productName="Dress" />);

    // No img whose src contains the placeholder path should exist
    const imgs = screen.getAllByRole('img');
    const hasPlaceholder = imgs.some((img) =>
      (img as HTMLImageElement).src.includes('bag-placeholder.svg'),
    );
    expect(hasPlaceholder).toBe(false);
  });
});
