import { expect, test } from '@playwright/test';

/**
 * A catalog card must not paint an image upscaled past {@link MAX_UPSCALE}.
 *
 * The grid serves the OE `thumb` preview, and nothing in the app resizes it: whatever the OE
 * preview template emits is what the browser stretches into the card. When the template was
 * producing 300×300 squares, a 431×575 card on a 2× screen was showing a 3.8× blow-up of a
 * 225×300 crop — visibly soft, and invisible to every other spec in this suite, which only ever
 * asserts that an image element exists.
 *
 * Measured at `deviceScaleFactor: 2`, because that is where the shortfall shows and where most
 * shoppers are. The check is deliberately generous: a little upscaling is imperceptible, a 2×
 * one is not.
 */
const MAX_UPSCALE = 2;

test.describe('Catalog card images', () => {
  test.use({ viewport: { width: 1728, height: 1000 }, deviceScaleFactor: 2 });

  test('card images are not upscaled past the readable limit', async ({ page }) => {
    await page.goto('/women/clothing', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    // The grid swaps its skeleton for real cards after hydration.
    await page.locator('main div.grid img').first().waitFor({ state: 'visible', timeout: 60_000 });

    const measured = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('main div.grid img')) as HTMLImageElement[];
      return imgs
        .filter((i) => i.naturalWidth > 0 && !i.currentSrc.startsWith('data:'))
        .slice(0, 8)
        .map((i) => {
          const r = i.getBoundingClientRect();
          const neededW = r.width * devicePixelRatio;
          const neededH = r.height * devicePixelRatio;
          // `object-fit: cover` throws away part of the source, so compare against the slice
          // that actually survives rather than the whole file.
          const srcRatio = i.naturalWidth / i.naturalHeight;
          const slotRatio = r.width / r.height;
          const usedW = srcRatio > slotRatio ? i.naturalHeight * slotRatio : i.naturalWidth;
          const usedH = srcRatio > slotRatio ? i.naturalHeight : i.naturalWidth / slotRatio;
          return {
            src: i.currentSrc.split('/').pop() ?? '',
            natural: `${i.naturalWidth}x${i.naturalHeight}`,
            needed: `${Math.round(neededW)}x${Math.round(neededH)}`,
            upscale: Math.max(neededW / usedW, neededH / usedH),
          };
        });
    });

    expect(measured.length, 'no catalog card images were measured').toBeGreaterThan(0);

    const tooSmall = measured.filter((m) => m.upscale > MAX_UPSCALE);
    expect(
      tooSmall.map((m) => `${m.src} ${m.natural} stretched to ${m.needed} (${m.upscale.toFixed(1)}x)`),
      'OE preview template emits a variant too small for the card slot — raise it to roughly 900x1200, 3:4',
    ).toEqual([]);
  });
});
