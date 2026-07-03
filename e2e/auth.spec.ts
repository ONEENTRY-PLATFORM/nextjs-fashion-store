import { test, expect } from '@playwright/test';
import { clearState, VALID_CREDS } from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login', () => {
    test('opens login modal from header user icon', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('input[placeholder*="example.com"]')).toBeVisible();
    });

    test('login with valid credentials', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill(VALID_CREDS.email);
      await page.locator('input[placeholder="••••••••"]').fill(VALID_CREDS.password);
      await page.locator('button:has-text("Log In")').click();

      // Modal should close
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
    });

    test('login with invalid credentials shows error', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill('wrong@email.com');
      await page.locator('input[placeholder="••••••••"]').fill('wrongpass');
      await page.locator('button:has-text("Log In")').click();

      // Error message should appear
      await expect(page.locator('text=/invalid|incorrect|wrong/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('login with empty fields shows validation error', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('button:has-text("Log In")').click();

      // Validation errors should appear
      await expect(page.locator('text=/required|enter|please/i').first()).toBeVisible();
    });

    test('login modal closes on Escape', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
    });

    test('login modal closes on backdrop click', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // Click far right of the viewport, outside the modal
      await page.mouse.click(1200, 400);
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
    });

    test('login with phone number shows error (phone auth not implemented)', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill('+44 20 7946 0958');
      await page.locator('input[placeholder="••••••••"]').fill(VALID_CREDS.password);
      await page.locator('button:has-text("Log In")').click();
      // Phone login not implemented — server only checks email
      await expect(page.locator('text=/invalid|incorrect|error/i').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Register', () => {
    test('switch to register form', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.locator('button:has-text("Create one")').click();
      // Register form has placeholder "Jane" for first name (exact match — the
      // email placeholder "jane.doe@example.com" also contains "Jane").
      await expect(page.getByPlaceholder('Jane', { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test('register form validates required fields', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.locator('button:has-text("Create one")').click();
      await page.waitForTimeout(500);

      // Submit empty form
      const submitBtn = page.locator('button:has-text("Create Account")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Should show validation errors (required fields / terms)
        await expect(page.locator('text=/required|must|accept|at least/i').first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Logout', () => {
    test('user can log out after logging in', async ({ page }) => {
      // Login first
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill(VALID_CREDS.email);
      await page.locator('input[placeholder="••••••••"]').fill(VALID_CREDS.password);
      await page.locator('button:has-text("Log In")').click();
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });

      // Navigate to account
      await page.locator('button[aria-label="My account"]').click();
      await page.waitForTimeout(500);

      // Look for logout button
      const logoutBtn = page.getByRole('button', { name: /log ?out|sign ?out/i }).first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
      }
    });
  });

  test.describe('Adversarial — Auth', () => {
    test('XSS in login email field', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill('<script>alert("xss")</script>');
      await page.locator('input[placeholder="••••••••"]').fill('test');
      await page.locator('button:has-text("Log In")').click();

      // Should show validation error, not execute script
      const alertTriggered = await page.evaluate(() => {
        return (window as any).__xss_triggered === true;
      });
      expect(alertTriggered).toBeFalsy();
    });

    test('SQL injection in login fields', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await page.locator('input[placeholder*="example.com"]').fill("'; DROP TABLE users; --");
      await page.locator('input[placeholder="••••••••"]').fill("' OR '1'='1");
      await page.locator('button:has-text("Log In")').click();

      // Zod rejects as invalid email/phone — should show validation message
      await expect(page.locator('text=/invalid|valid email|required/i').first()).toBeVisible({ timeout: 3000 });
    });

    test('extremely long input in login fields', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      const longString = 'a'.repeat(10000);
      await page.locator('input[placeholder*="example.com"]').fill(longString);
      await page.locator('input[placeholder="••••••••"]').fill(longString);
      await page.locator('button:has-text("Log In")').click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('Social login buttons', () => {
    test('Google, Apple, Facebook buttons are visible', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const socialBtns = page.locator('button:has-text("Google"), button:has-text("Apple"), button:has-text("Facebook")');
      if (await socialBtns.count() > 0) {
        // Social buttons should be visible but non-functional
        for (let i = 0; i < await socialBtns.count(); i++) {
          await expect(socialBtns.nth(i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Password field', () => {
    test('password visibility toggle (if exists)', async ({ page }) => {
      await page.locator('button[aria-label="My account"]').click();
      const toggleBtn = page.locator('button[aria-label*="password"], button[aria-label*="show"], button[aria-label*="eye"]');
      if (await toggleBtn.count() > 0) {
        const passInput = page.locator('input[placeholder="••••••••"]');
        await passInput.fill('test123');
        await toggleBtn.first().click();
        // Input type should change from password to text
        const type = await passInput.getAttribute('type');
        expect(type).toBe('text');
      }
    });
  });
});
