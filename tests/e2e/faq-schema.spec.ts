import { expect, test } from '@playwright/test';

/**
 * `FAQPage` structured data on `/faq` is derived from the OneEntry section
 * blocks the page renders — it used to come from a hardcoded Q&A array that
 * nothing displayed, which is exactly the visible-content mismatch Google
 * penalises.
 *
 * The suite therefore checks the invariant, not a question list: whatever ends
 * up in the markup must also be on the page, and no markup at all is the
 * correct output when the CMS has no question-shaped sections.
 */
test.describe('FAQ structured data', () => {
  test('every question in the markup is visible on the page', async ({ page }) => {
    await page.goto('/faq', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="info-sections"]').waitFor({ state: 'attached', timeout: 60_000 });

    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqBlobs = blobs
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter((data): data is { mainEntity?: { name?: string }[] } => data?.['@type'] === 'FAQPage');

    // No Q&A sections in OE → no FAQPage node. That is a pass, not a gap.
    test.skip(faqBlobs.length === 0, 'tenant has no question-shaped info sections');

    const questions = faqBlobs.flatMap((b) => (b.mainEntity ?? []).map((q) => (q.name ?? '').trim()));
    expect(questions.length).toBeGreaterThan(0);

    const headings = (await page.locator('[data-testid="info-section"] h2').allInnerTexts()).map((t) => t.trim());

    for (const question of questions) {
      expect(headings).toContain(question);
    }
  });

  test('non-FAQ info pages carry no FAQPage markup', async ({ page }) => {
    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="info-sections"]').waitFor({ state: 'attached', timeout: 60_000 });

    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blobs.map((raw) => {
      try {
        return JSON.parse(raw)?.['@type'];
      } catch {
        return null;
      }
    });
    expect(types).not.toContain('FAQPage');
  });
});
