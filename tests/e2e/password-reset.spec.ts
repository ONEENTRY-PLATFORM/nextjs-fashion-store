/**
 * Password recovery — OE's one-time-code flow, end to end.
 *
 * The three OE calls are stubbed at the network edge rather than driven for
 * real: a genuine run would mail a code to a real inbox, and the suite has no
 * way to read it back. What the stubs cannot fake is the wiring — which call
 * fires with which arguments, and what the screen does with each answer — and
 * that is exactly what these assertions cover.
 *
 * Locators are testids throughout: every caption on this screen comes from the
 * CMS `sign_in` set, so matching copy would break on `/de` and on any edit in
 * the admin panel.
 */
import { expect, type Page, test } from '@playwright/test';

import { clearState, clickAccountIcon } from './helpers';

/** OE endpoint suffixes the recovery flow talks to. */
const OE = {
  generateCode: '**/users-auth-providers/marker/*/users/generate-code',
  checkCode: '**/users-auth-providers/marker/*/users/check-code',
  changePassword: '**/users-auth-providers/marker/*/users/change-password',
  auth: '**/users-auth-providers/marker/*/users/auth',
} as const;

const RESET_EMAIL = 'shopper@example.com';
const NEW_PASSWORD = 'n3wPassw0rd!';

/** Requests the page actually made, so the test can assert the payloads. */
interface Captured {
  generateCode: unknown[];
  checkCode: unknown[];
  changePassword: unknown[];
}

/**
 * Stub the recovery endpoints. `codeAccepted` decides what `check-code`
 * answers — OE replies `201 false` for a wrong code, not an error object.
 */
async function stubRecovery(page: Page, { codeAccepted = true } = {}): Promise<Captured> {
  const captured: Captured = { generateCode: [], checkCode: [], changePassword: [] };

  await page.route(OE.generateCode, async (route) => {
    captured.generateCode.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: '' });
  });
  await page.route(OE.checkCode, async (route) => {
    captured.checkCode.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: String(codeAccepted) });
  });
  await page.route(OE.changePassword, async (route) => {
    captured.changePassword.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: 'true' });
  });
  // The flow signs the shopper in on success — answer with a session-shaped
  // body so that last step doesn't hang on the real tenant.
  await page.route(OE.auth, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-access-token',
        refreshToken: 'e2e-refresh-token',
        userIdentifier: RESET_EMAIL,
      }),
    });
  });

  return captured;
}

/** Open the sign-in modal, then the recovery modal from its "forgot" link. */
async function openRecovery(page: Page) {
  await clickAccountIcon(page);
  await expect(page.getByTestId('login-forgot-password')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('login-forgot-password').click();
  await expect(page.getByTestId('reset-password-modal')).toBeVisible({ timeout: 30_000 });
}

test.describe('Password recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('the "forgot password" link opens the recovery flow', async ({ page }) => {
    // It used to `alert()` "Password reset link sent!" and call nothing at all.
    const alerts: string[] = [];
    page.on('dialog', async (d) => {
      alerts.push(d.message());
      await d.dismiss();
    });
    await openRecovery(page);
    await expect(page.getByTestId('reset-email')).toBeVisible();
    expect(alerts).toEqual([]);
  });

  test('carries the address already typed in the sign-in field', async ({ page }) => {
    await clickAccountIcon(page);
    await page.getByTestId('login-email').fill(RESET_EMAIL);
    await page.getByTestId('login-forgot-password').click();
    await expect(page.getByTestId('reset-email')).toHaveValue(RESET_EMAIL);
  });

  test('rejects an invalid address before calling OE', async ({ page }) => {
    const captured = await stubRecovery(page);
    await openRecovery(page);
    await page.getByTestId('reset-email').fill('not-an-email');
    await page.getByTestId('reset-send-code').click();
    await expect(page.getByTestId('reset-error')).toBeVisible();
    expect(captured.generateCode).toHaveLength(0);
  });

  test('asks OE for a code, then blocks resend until it expires', async ({ page }) => {
    const captured = await stubRecovery(page);
    await openRecovery(page);
    await page.getByTestId('reset-email').fill(RESET_EMAIL);
    await page.getByTestId('reset-send-code').click();

    await expect(page.getByTestId('reset-code')).toBeVisible();
    await expect(page.getByTestId('reset-code-hint')).toContainText(RESET_EMAIL);
    // The countdown runs the provider's real TTL, and OE refuses a second code
    // while the first is alive ("User already has a code").
    await expect(page.getByTestId('reset-resend')).toBeDisabled();
    expect(captured.generateCode).toHaveLength(1);
    expect(captured.generateCode[0]).toMatchObject({ userIdentifier: RESET_EMAIL, eventIdentifier: 'send_code' });
  });

  test('a wrong code keeps the shopper on the code step', async ({ page }) => {
    await stubRecovery(page, { codeAccepted: false });
    await openRecovery(page);
    await page.getByTestId('reset-email').fill(RESET_EMAIL);
    await page.getByTestId('reset-send-code').click();
    await page.getByTestId('reset-code').fill('00000000');
    await page.getByTestId('reset-verify-code').click();

    await expect(page.getByTestId('reset-error')).toBeVisible();
    await expect(page.getByTestId('reset-code')).toBeVisible();
    await expect(page.getByTestId('reset-new-password')).toBeHidden();
  });

  test('code then new password changes it in recovery mode and signs in', async ({ page }) => {
    const captured = await stubRecovery(page);
    await openRecovery(page);
    await page.getByTestId('reset-email').fill(RESET_EMAIL);
    await page.getByTestId('reset-send-code').click();
    await page.getByTestId('reset-code').fill('12345678');
    await page.getByTestId('reset-verify-code').click();

    await expect(page.getByTestId('reset-new-password')).toBeVisible();
    await page.getByTestId('reset-new-password').fill(NEW_PASSWORD);
    await page.getByTestId('reset-confirm-password').fill(NEW_PASSWORD);
    await page.getByTestId('reset-submit').click();

    // Modal closes because the shopper is signed in with the new password.
    await expect(page.getByTestId('reset-password-modal')).toBeHidden({ timeout: 15_000 });
    expect(captured.changePassword).toHaveLength(1);
    // `type: 2` is OE's recovery mode; `1` would be an authenticated change.
    expect(captured.changePassword[0]).toMatchObject({
      userIdentifier: RESET_EMAIL,
      eventIdentifier: 'send_code',
      type: 2,
      code: '12345678',
      password1: NEW_PASSWORD,
      password2: NEW_PASSWORD,
    });
  });

  test('mismatched passwords never reach OE', async ({ page }) => {
    const captured = await stubRecovery(page);
    await openRecovery(page);
    await page.getByTestId('reset-email').fill(RESET_EMAIL);
    await page.getByTestId('reset-send-code').click();
    await page.getByTestId('reset-code').fill('12345678');
    await page.getByTestId('reset-verify-code').click();
    await page.getByTestId('reset-new-password').fill(NEW_PASSWORD);
    await page.getByTestId('reset-confirm-password').fill(`${NEW_PASSWORD}-typo`);
    await page.getByTestId('reset-submit').click();

    await expect(page.getByTestId('reset-error')).toBeVisible();
    expect(captured.changePassword).toHaveLength(0);
  });

  test('back to sign in returns to the login modal', async ({ page }) => {
    await openRecovery(page);
    await page.getByTestId('reset-back-to-login').click();
    await expect(page.getByTestId('reset-password-modal')).toBeHidden();
    await expect(page.getByTestId('login-email')).toBeVisible();
  });
});
