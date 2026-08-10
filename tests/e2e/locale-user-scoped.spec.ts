import { expect, test } from '@playwright/test';

import { clearState, login } from './helpers';

/**
 * Shopper-scoped OneEntry calls must answer in the locale the shopper is
 * browsing in.
 *
 * They did not. `AuthContext` called `reDefine(refresh)` with no `langCode`, so
 * the browser SDK instance never left its constructor default, and every
 * user-scoped call in `auth/actions.ts` additionally passed `DEFAULT_LOCALE`
 * as a literal. A shopper on `/de` therefore got English order statuses, tier
 * names and profile copy — with nothing in the type system to notice, because
 * `en_US` is a perfectly valid locale to ask for.
 *
 * Asserting on the request rather than on rendered text is deliberate: whether
 * a given string is actually translated in the panel is the editor's business
 * and would make this test a content check. What the code owes is asking for
 * the right locale.
 */

/** `Users.getUser` — fired on session bootstrap by `getCurrentUserAction`. */
const USER_CALL = /\/api\/content\/users/;

test.describe('Locale reaches shopper-scoped SDK calls', () => {
  test('a shopper on /de asks OneEntry for de_DE', async ({ page }) => {
    const localeParams: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!USER_CALL.test(url)) return;
      const value = new URL(url).searchParams.get('langCode');
      if (value) localeParams.push(value);
    });

    await page.goto('/de/account', { waitUntil: 'domcontentloaded' });
    await clearState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await login(page);

    // The bootstrap `/me` read happens right after login.
    await expect
      .poll(() => localeParams.length, { timeout: 15_000, message: 'no user-scoped OE request was observed' })
      .toBeGreaterThan(0);

    // Every observed user-scoped call must carry the route's locale. Checking
    // all of them, not just the first: the regression was systemic, so one
    // corrected call site passing while its neighbours still send `en_US`
    // would be a false green.
    expect(localeParams.every((l) => l === 'de_DE')).toBe(true);
  });

  test('the default locale is unaffected', async ({ page }) => {
    const localeParams: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!USER_CALL.test(url)) return;
      const value = new URL(url).searchParams.get('langCode');
      if (value) localeParams.push(value);
    });

    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await clearState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await login(page);

    await expect
      .poll(() => localeParams.length, { timeout: 15_000, message: 'no user-scoped OE request was observed' })
      .toBeGreaterThan(0);

    expect(localeParams.every((l) => l === 'en_US')).toBe(true);
  });
});
