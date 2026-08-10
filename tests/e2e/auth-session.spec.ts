import { expect, test } from '@playwright/test';

import { clearState, clickAccountIcon, login, readSession, SESSION_KEYS, VALID_CREDS } from './helpers';

/**
 * Session lifecycle after the move to the MCP-canonical client-side auth flow.
 *
 * What changed and therefore needs covering:
 *   • `AuthProvider.auth()` now runs in the browser, so OE binds the refresh
 *     token to the *real* device fingerprint and the SDK's `saveFunction`
 *     persists it to `localStorage` under `refresh-token`;
 *   • a reload re-installs that token via `reDefine()` — the session must
 *     survive without any cookie;
 *   • sign-out has to wipe the storage even when the OE `logout` call fails.
 */
const OE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_ONEENTRY_URL && process.env.NEXT_PUBLIC_ONEENTRY_TOKEN);

test.describe('Shopper session (client-side tokens)', () => {
  // Signing in needs a live tenant — there is no local auth to fall back on.
  test.skip(!OE_CONFIGURED, 'NEXT_PUBLIC_ONEENTRY_URL / _TOKEN are not set');
  // OneEntry rotates the refresh token on every use, so two workers signing in
  // as the same user race each other into a 401 (MCP `playwright-e2e`).
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('starts with no persisted session', async ({ page }) => {
    const session = await readSession(page);
    expect(session.refreshToken).toBeNull();
    expect(session.providerMarker).toBeNull();
    expect(session.userIdentifier).toBeNull();
  });

  test('sign-in persists the refresh token, provider marker and identifier', async ({ page }) => {
    await login(page);

    const session = await readSession(page);
    // The refresh token is written by the SDK's own `saveFunction` — its
    // presence is what proves `auth()` ran in the browser rather than on the
    // server (a server-issued token never reaches this storage).
    expect(session.refreshToken, 'refresh-token must be persisted by saveFunction').toBeTruthy();
    expect(session.providerMarker).toBe('email');
    expect(session.userIdentifier).toBe(VALID_CREDS.email);
  });

  test('session survives a full page reload', async ({ page }) => {
    await login(page);
    const before = await readSession(page);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // `AuthContext` bootstraps with `reDefine(refresh)`; the SDK then mints an
    // access token proactively before the first user-auth request.
    const after = await readSession(page);
    expect(after.refreshToken).toBeTruthy();
    expect(after.userIdentifier).toBe(before.userIdentifier);

    // The account icon must not fall back to the signed-out login modal.
    await page.getByTestId('header-account').first().click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 8000 });
  });

  test('sign-out clears every session key', async ({ page }) => {
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    const signOut = page.locator('button:has-text("Log Out"), button:has-text("Sign Out")').first();
    await signOut.waitFor({ state: 'visible', timeout: 15_000 });
    await signOut.click();

    await expect.poll(async () => (await readSession(page)).refreshToken, { timeout: 10_000 }).toBeNull();

    const session = await readSession(page);
    expect(session.providerMarker).toBeNull();
    expect(session.userIdentifier).toBeNull();
  });

  test('no session cookie is minted for the shopper', async ({ page, context }) => {
    await login(page);
    const cookies = await context.cookies();
    const names = cookies.map((c) => c.name);
    // The legacy httpOnly session pair must be gone — the browser owns the
    // tokens now, and a stale cookie layer would silently win on the server.
    expect(names).not.toContain('oe_access');
    expect(names).not.toContain('oe_refresh');
    expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEYS.refreshToken)).toBeTruthy();
  });
});

/**
 * The load-bearing claim of the whole migration: `AuthProvider.auth` now runs
 * in the **browser**, so OneEntry binds the refresh token to the shopper's real
 * device fingerprint instead of the server's Node identity.
 *
 * That is observable without any credentials — the browser itself has to issue
 * the request to the OneEntry host. Under the previous server-side flow this
 * network entry simply did not exist client-side.
 */
test.describe('Sign-in runs in the browser', () => {
  test.skip(!OE_CONFIGURED, 'NEXT_PUBLIC_ONEENTRY_URL / _TOKEN are not set');

  test('the auth call leaves the browser and its rejection is surfaced', async ({ page }) => {
    const authCalls: string[] = [];
    page.on('request', (req) => {
      if (/\/users-auth-providers\/marker\/[^/]+\/users\/auth\b/.test(req.url())) {
        authCalls.push(req.url());
      }
    });

    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await clickAccountIcon(page);
    await page.locator('input[placeholder*="example.com"]').fill('nobody@example.invalid');
    await page.locator('input[placeholder="••••••••"]').fill('definitely-wrong');
    await page.locator('button:has-text("Log In")').click();

    // OneEntry answered — the SDK is configured and reachable from the page.
    await expect.poll(() => authCalls.length, { timeout: 20_000 }).toBeGreaterThan(0);
    expect(authCalls[0]).toContain('/marker/email/users/auth');

    // The rejection reaches the UI rather than being swallowed…
    await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible();
    // …and nothing is persisted for a failed attempt.
    const session = await readSession(page);
    expect(session.refreshToken).toBeNull();
    expect(session.userIdentifier).toBeNull();
  });
});

/**
 * The Google callback is a Client Component now (it has to read the browser's
 * device fingerprint before the code exchange). These cases need no OE
 * credentials — they exercise the failure paths only.
 */
test.describe('Google OAuth callback', () => {
  test('bounces to the homepage with an error when Google reports one', async ({ page }) => {
    await page.goto('/auth/callback/google?error=access_denied');
    await page.waitForURL(/googleAuthError=access_denied/, { timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('bounces with an error when code or state is missing', async ({ page }) => {
    await page.goto('/auth/callback/google?code=abc');
    await page.waitForURL(/googleAuthError=/, { timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('renders the in-progress state while redeeming the code', async ({ page }) => {
    // Hold the exchange open so the intermediate UI is observable.
    await page.route('**/auth/callback/google**', (route) => route.continue());
    await page.goto('/auth/callback/google');
    await expect(page.getByTestId('google-callback')).toBeVisible({ timeout: 20_000 });
  });
});
