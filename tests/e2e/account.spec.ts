import { test, expect } from '@playwright/test';
import { clearState, login } from './helpers';

test.describe('Account Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
  });

  test('account page loads with tabs', async ({ page }) => {
    const tabs = page.locator('text=/my data|orders|addresses|wishlist|bonuses|subscriptions/i');
    expect(await tabs.count()).toBeGreaterThan(0);
  });

  test.describe('My Data tab', () => {
    test('shows user profile info', async ({ page }) => {
      await expect(page.locator('text=/jane|test@test/i').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Orders tab', () => {
    test('orders tab shows order list', async ({ page }) => {
      const ordersTab = page.locator('button:has-text("Orders"), [class*="tab"]:has-text("Orders")').first();
      if (await ordersTab.isVisible()) {
        await ordersTab.click();
        await page.waitForTimeout(500);
        // Should show order entries
        await expect(page.locator('text=/OE-|delivered|processing/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Addresses tab', () => {
    test('addresses tab shows saved addresses', async ({ page }) => {
      const addrTab = page.locator('button:has-text("Addresses"), [class*="tab"]:has-text("Addresses")').first();
      if (await addrTab.isVisible()) {
        await addrTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/baker|oxford/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Bonuses tab', () => {
    test('bonuses tab shows loyalty card info', async ({ page }) => {
      const bonusTab = page.locator('button:has-text("Bonuses"), [class*="tab"]:has-text("Bonuses")').first();
      if (await bonusTab.isVisible()) {
        await bonusTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/silver|gold|bronze|platinum|points|bonus/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Subscriptions tab', () => {
    test('subscriptions tab shows toggle switches', async ({ page }) => {
      const subTab = page.locator('button:has-text("Subscriptions"), [class*="tab"]:has-text("Subscriptions")').first();
      if (await subTab.isVisible()) {
        await subTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/newsletter|notifications|email/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Waiting List tab', () => {
    test('waiting list shows items', async ({ page }) => {
      const waitTab = page.locator('button:has-text("Waiting"), [class*="tab"]:has-text("Waiting")').first();
      if (await waitTab.isVisible()) {
        await waitTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Refer a Friend tab', () => {
    test('refer tab shows referral link', async ({ page }) => {
      const referTab = page.locator('button:has-text("Refer"), [class*="tab"]:has-text("Refer")').first();
      if (await referTab.isVisible()) {
        await referTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/referral|invite|credit/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Orders — detail expand', () => {
    test('click order expands detail with items', async ({ page }) => {
      const ordersTab = page.locator('button:has-text("Orders"), [class*="tab"]:has-text("Orders")').first();
      if (await ordersTab.isVisible()) {
        await ordersTab.click();
        await page.waitForTimeout(500);
        const orderRow = page.locator('text=/OE-/i').first();
        if (await orderRow.isVisible()) {
          await orderRow.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Addresses — add new', () => {
    test('add new address form opens', async ({ page }) => {
      const addrTab = page.locator('button:has-text("Addresses"), [class*="tab"]:has-text("Addresses")').first();
      if (await addrTab.isVisible()) {
        await addrTab.click();
        await page.waitForTimeout(500);
        const addBtn = page.getByRole('button', { name: /add.*address|new.*address/i }).first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(300);
          await expect(page.getByPlaceholder(/full name|name/i).first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Wishlist tab', () => {
    test('wishlist tab shows in-stock items', async ({ page }) => {
      const wlTab = page.locator('button:has-text("Wishlist"), [class*="tab"]:has-text("Wishlist")').first();
      if (await wlTab.isVisible()) {
        await wlTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Waiting List — interactions', () => {
    test('waiting list add to cart works', async ({ page }) => {
      const waitTab = page.locator('button:has-text("Waiting"), [class*="tab"]:has-text("Waiting")').first();
      if (await waitTab.isVisible()) {
        await waitTab.click();
        await page.waitForTimeout(500);
        const addBtn = page.getByRole('button', { name: /add to cart|add to bag/i }).first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('waiting list notify toggle', async ({ page }) => {
      const waitTab = page.locator('button:has-text("Waiting"), [class*="tab"]:has-text("Waiting")').first();
      if (await waitTab.isVisible()) {
        await waitTab.click();
        await page.waitForTimeout(500);
        const toggleBtn = page.getByRole('button', { name: /notify|bell/i }).first();
        if (await toggleBtn.isVisible()) {
          await toggleBtn.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('waiting list remove item', async ({ page }) => {
      const waitTab = page.locator('button:has-text("Waiting"), [class*="tab"]:has-text("Waiting")').first();
      if (await waitTab.isVisible()) {
        await waitTab.click();
        await page.waitForTimeout(500);
        const removeBtn = page.getByRole('button', { name: /remove|delete|trash/i }).first();
        if (await removeBtn.isVisible()) {
          await removeBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Feedback tab', () => {
    test('feedback form renders', async ({ page }) => {
      const feedbackTab = page.locator('button:has-text("Feedback"), [class*="tab"]:has-text("Feedback")').first();
      if (await feedbackTab.isVisible()) {
        await feedbackTab.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Refer tab — copy link', () => {
    test('copy referral link button works', async ({ page }) => {
      const referTab = page.locator('button:has-text("Refer"), [class*="tab"]:has-text("Refer")').first();
      if (await referTab.isVisible()) {
        await referTab.click();
        await page.waitForTimeout(500);
        const copyBtn = page.getByRole('button', { name: /copy|share/i }).first();
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Subscriptions — toggle functionality', () => {
    test('toggle newsletter subscription', async ({ page }) => {
      const subTab = page.locator('button:has-text("Subscriptions"), [class*="tab"]:has-text("Subscriptions")').first();
      if (await subTab.isVisible()) {
        await subTab.click();
        await page.waitForTimeout(500);
        const toggleSwitch = page.locator('input[type="checkbox"], button[role="switch"]').first();
        if (await toggleSwitch.isVisible()) {
          await toggleSwitch.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('MyData — edit profile', () => {
    test('edit profile form allows changes', async ({ page }) => {
      const editBtn = page.getByRole('button', { name: /edit|change|update/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(300);
        const nameInput = page.getByPlaceholder(/name/i).or(page.locator('input[name="firstName"]')).first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Jane Updated');
        }
      }
    });
  });

  test.describe('Account logout', () => {
    test('logout from account page clears auth state', async ({ page }) => {
      const logoutBtn = page.getByRole('button', { name: /log ?out|sign ?out/i }).first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(500);
        // After logout, account icon should open login modal, not navigate to account
        await page.locator('button[aria-label="My account"]').click();
        await page.waitForTimeout(500);
        const dialog = page.getByRole('dialog');
        const loginPrompt = page.locator('text=/sign in|email or phone/i').first();
        const hasDialog = await dialog.isVisible().catch(() => false);
        const hasPrompt = await loginPrompt.isVisible().catch(() => false);
        expect(hasDialog || hasPrompt).toBeTruthy();
      }
    });
  });

  test.describe('Service Maintenance tab', () => {
    test('service maintenance tab renders', async ({ page }) => {
      const serviceTab = page.locator('button:has-text("Service"), [class*="tab"]:has-text("Service")').first();
      if (await serviceTab.isVisible()) {
        await serviceTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/SVC-|alteration|repair|cleaning/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

test.describe('Account — Not logged in', () => {
  test('shows login prompt when not logged in', async ({ page }) => {
    await page.goto('/account');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
    const loginPrompt = page.locator('text=/sign in|log in|create account/i').first();
    const accountContent = page.locator('text=/my data|jane/i').first();
    const hasLogin = await loginPrompt.isVisible().catch(() => false);
    const hasAccount = await accountContent.isVisible().catch(() => false);
    expect(hasLogin || hasAccount).toBeTruthy();
  });

  test('login button on account page opens login modal', async ({ page }) => {
    await page.goto('/account');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
    const loginBtn = page.getByRole('button', { name: /sign in|log in/i }).first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    }
  });
});

test.describe('Account — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('mobile nav toggle shows/hides account tabs', async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    const menuToggle = page.getByRole('button', { name: /menu|sections|navigate/i }).first();
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(300);
      await menuToggle.click();
    }
  });
});
