/**
 * Accessibility contract of the sign-up consent / subscription checkboxes.
 *
 * These used to be a `<span>` with an `onClick`: no role, no checked state, no
 * keyboard access, and a caption that was inert because the wrapping `<label>`
 * had no control to associate with. Registration was mouse-only, since the
 * terms box is required. The assertions below are the behaviours that were
 * missing — they fail against the old markup.
 */
import { expect, test } from '@playwright/test';

import { clickAccountIcon } from './helpers';

/** Open the sign-up modal from a clean session. */
async function openRegisterModal(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await clickAccountIcon(page);
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  await page
    .getByRole('button', { name: /create one|sign up|register/i })
    .first()
    .click();
  await expect(page.getByTestId('register-agree-terms')).toBeAttached({ timeout: 10_000 });
  return dialog;
}

const BOXES = ['register-agree-terms', 'register-subscribe-email', 'register-subscribe-sms'] as const;

test.describe('Sign-up consent checkboxes — accessibility', () => {
  test('each control is a real checkbox, unchecked by default', async ({ page }) => {
    await openRegisterModal(page);
    for (const id of BOXES) {
      const box = page.getByTestId(id);
      await expect(box).toHaveAttribute('type', 'checkbox');
      await expect(box).not.toBeChecked();
    }
  });

  test('terms box is keyboard-operable — focus then Space toggles it', async ({ page }) => {
    await openRegisterModal(page);
    const terms = page.getByTestId('register-agree-terms');

    await terms.focus();
    await expect(terms).toBeFocused();

    await page.keyboard.press('Space');
    await expect(terms).toBeChecked();

    await page.keyboard.press('Space');
    await expect(terms).not.toBeChecked();
  });

  test('clicking the caption toggles the box', async ({ page }) => {
    const dialog = await openRegisterModal(page);
    const terms = page.getByTestId('register-agree-terms');

    // The legal block is the last label in the modal; its direct children are
    // the sr-only input, the visual box, then the caption. Click the caption's
    // top-left corner — that lands on the plain "I agree to the …" prefix
    // rather than the Terms anchor, which is deliberately inert (see the next
    // test). Clicking the words, not the 16 px box, is what a mouse user does
    // and what the previous markup ignored.
    const caption = dialog.locator('label').last().locator('> span').last();
    await caption.click({ position: { x: 4, y: 4 } });
    await expect(terms).toBeChecked();
  });

  test('opening a legal link does not tick the consent box', async ({ page }) => {
    const dialog = await openRegisterModal(page);
    const terms = page.getByTestId('register-agree-terms');

    // Anchors are interactive content, so the HTML spec suppresses the label's
    // activation behaviour for them. Consent must be a deliberate act, never a
    // side effect of reading what is being consented to.
    const legalLink = dialog.locator('label').last().locator('a').first();
    await expect(legalLink).toBeVisible();
    await legalLink.click();

    await expect(terms).not.toBeChecked();
  });

  test('marketing boxes toggle independently of consent', async ({ page }) => {
    await openRegisterModal(page);
    const email = page.getByTestId('register-subscribe-email');
    const terms = page.getByTestId('register-agree-terms');

    await email.focus();
    await page.keyboard.press('Space');

    await expect(email).toBeChecked();
    await expect(terms).not.toBeChecked();
  });
});
