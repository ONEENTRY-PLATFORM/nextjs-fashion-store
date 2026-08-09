import { expect, type Page, test } from '@playwright/test';

/**
 * LQIP blur placeholders on CMS pictures.
 *
 * OneEntry ships a ~130-character base64 WebP alongside every image uploaded
 * through a preview template (`previewLink[level][0]`). `CmsImage` turns that
 * into `next/image`'s `placeholder="blur"`, and Next renders it as an inline
 * `background-image` — an SVG gaussian-blur filter wrapping the data URI.
 *
 * These specs guard the two halves that have each broken once already:
 *   1. the data URI surviving the trip from the API through the adapters, and
 *   2. the placeholder actually being *visible* — an earlier revision of
 *      `ProductCard` held the wrapper at `opacity-0` until `onLoad`, which
 *      rendered the blur correctly and then hid it.
 */

/** Every CMS-backed image on the page, as `CmsImage` marks them. */
const cmsImages = (page: Page) => page.locator('img[data-blur]');

/** Read how Next painted the placeholder for each CMS image. */
async function blurState(page: Page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-blur]'));
    return {
      total: imgs.length,
      flaggedOn: imgs.filter((i) => i.dataset.blur === 'on').length,
      painted: imgs.filter((i) => (i.style.backgroundImage || '').includes('feGaussianBlur')).length,
      // The LQIP itself lives inside the SVG filter Next wraps around it.
      carriesLqip: imgs.filter((i) =>
        decodeURIComponent(i.style.backgroundImage || '').includes('data:image/webp;base64'),
      ).length,
    };
  });
}

test.describe('CMS image blur placeholder', () => {
  test('catalog cards carry the LQIP from OneEntry', async ({ page }) => {
    // `domcontentloaded`, not the default `load`: with the image optimizer on
    // a cold cache, waiting for every transcoded photo blows the test timeout.
    // The blur is server-rendered, so it is already asserted-on by then.
    await page.goto('/en/women/clothing', { waitUntil: 'domcontentloaded' });
    await expect(cmsImages(page).first()).toBeAttached();

    const state = await blurState(page);
    expect(state.total).toBeGreaterThan(0);
    // Every product photo in this tenant went through the preview template.
    expect(state.flaggedOn).toBe(state.total);
  });

  test('the placeholder is visible while the full image is still loading', async ({ page }) => {
    // Stall the full-size photos so the placeholder is what remains on screen.
    // Aborting instead of delaying would trip the card's `onError` branch and
    // swap in the bag icon, which hides the blur and would pass vacuously.
    await page.route('**/cloud-static/**', async (route) => {
      if (!/\.preview\.(default|thumb)\./.test(route.request().url())) {
        await page.waitForTimeout(15_000).catch(() => {});
      }
      return route.continue().catch(() => {});
    });

    await page.goto('/en/women/clothing', { waitUntil: 'domcontentloaded' });
    await expect(cmsImages(page).first()).toBeAttached();

    const state = await blurState(page);
    expect(state.painted).toBeGreaterThan(0);
    expect(state.carriesLqip).toBe(state.painted);

    // The container must not be hidden behind an opacity gate while it waits.
    const opacity = await cmsImages(page)
      .first()
      .evaluate((img) => getComputedStyle(img.parentElement as HTMLElement).opacity);
    expect(Number(opacity)).toBeGreaterThan(0);
  });

  test('the product gallery blurs its main frame and thumbnails', async ({ page }) => {
    await page.goto('/en/women/clothing', { waitUntil: 'domcontentloaded' });
    await cmsImages(page).first().click();
    await page.waitForURL(/\/product\//);

    const main = page.getByTestId('pdp-gallery-main-image');
    await expect(main).toBeAttached();
    await expect(main).toHaveAttribute('data-blur', 'on');

    // Thumbnails render through the same wrapper, so they get one too.
    expect((await blurState(page)).flaggedOn).toBeGreaterThan(1);
  });

  test('images without an LQIP degrade to no placeholder instead of throwing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/en/women/clothing', { waitUntil: 'domcontentloaded' });
    await expect(cmsImages(page).first()).toBeAttached();

    // `placeholder="blur"` without a `blurDataURL` makes next/image throw on a
    // remote source; CmsImage's guard is what keeps that from happening.
    expect(errors.filter((m) => /blurDataURL|placeholder/i.test(m))).toEqual([]);
  });
});
