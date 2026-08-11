/// <reference types="@testing-library/jest-dom" />
/**
 * HomeSkeleton — the fallback rendered by `app/[locale]/(home)/loading.tsx`.
 *
 * The homepage used to fall back to the segment-wide catalog grid, so the
 * placeholder and the page it announced had nothing in common. What matters
 * here is the agreement with the real markup: same block order as
 * `HOMEPAGE_MARKER_ORDER`, and the same geometry as the components each block
 * renders (600px hero, 6-up category grid, five-across carousels, two 4:5
 * promo photos, 480px banner). These assertions fail the moment the homepage
 * is reshuffled without the skeleton following.
 */
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { HomeSkeleton } from '@/app/components/home/HomeSkeleton';

afterEach(cleanup);

/**
 * Tailwind classes on an element. The suite does not register jest-dom's
 * matchers at runtime (only its types), so class assertions read the list.
 *
 * @param   el - Element to inspect.
 * @returns      Its class names.
 */
function classesOf(el: Element | null | undefined): string[] {
  return Array.from(el?.classList ?? []);
}

describe('HomeSkeleton', () => {
  it('paints the homepage blocks in the order the page renders them', () => {
    const { container } = render(<HomeSkeleton />);

    const order = Array.from(container.querySelectorAll('[data-testid$="-skeleton"]')).map((el) =>
      el.getAttribute('data-testid'),
    );

    expect(order).toEqual([
      'home-hero-skeleton',
      'home-category-skeleton',
      'home-carousel-skeleton', // homepage_new_arrivals
      'home-promo-skeleton',
      'home-carousel-skeleton', // homepage_sale
      'home-carousel-skeleton', // homepage_best_sellers
      'home-banner-skeleton',
    ]);
  });

  it('reserves the hero and banner heights the real sections occupy', () => {
    render(<HomeSkeleton />);

    // `h-150` / `h-120` are the literal heights of `HeroSlider` and
    // `DiscountBanner`; a mismatch here is a visible jump on the swap.
    expect(classesOf(screen.getByTestId('home-hero-skeleton'))).toEqual(expect.arrayContaining(['h-150', 'w-full']));
    expect(classesOf(screen.getByTestId('home-banner-skeleton'))).toEqual(expect.arrayContaining(['h-120', 'w-full']));
  });

  it('lays the category tiles out 6-up and the carousels 5-across', () => {
    const { container } = render(<HomeSkeleton />);

    const categoryGrid = screen.getByTestId('home-category-skeleton').querySelector('.grid');
    expect(classesOf(categoryGrid)).toEqual(
      expect.arrayContaining(['grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-6']),
    );
    expect(categoryGrid?.children).toHaveLength(6);

    const carousels = screen.getAllByTestId('home-carousel-skeleton');
    expect(carousels).toHaveLength(3);
    for (const carousel of carousels) {
      const track = carousel.querySelector('.flex.overflow-hidden');
      expect(track?.children).toHaveLength(5);
      expect(classesOf(track?.firstElementChild)).toEqual(expect.arrayContaining(['w-1/2', 'md:w-1/3', 'lg:w-1/5']));
    }

    // Two promo photos side by side on ≥sm, one per row on mobile.
    const promoGrid = screen.getByTestId('home-promo-skeleton').querySelector('.grid');
    expect(classesOf(promoGrid)).toEqual(expect.arrayContaining(['grid-cols-1', 'sm:grid-cols-2']));
    expect(promoGrid?.children).toHaveLength(2);

    // Nothing in the fallback is announced — it is all decorative.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
