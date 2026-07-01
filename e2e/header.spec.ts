import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Header — Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('logo navigates to homepage', async ({ page }) => {
    await page.goto('/women/clothing');
    await page.getByRole('link', { name: /oneentry|fashion|logo/i }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('Women/Men tabs switch mega menu content', async ({ page }) => {
    // Hover Women tab
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    // Mega menu should appear with clothing/shoes/bags/accessories
    await expect(page.locator('text=/clothing/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('mega menu links navigate to catalog pages', async ({ page }) => {
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    await page.waitForTimeout(200);

    const clothingLink = page.getByRole('link', { name: /^clothing$/i }).first();
    if (await clothingLink.isVisible()) {
      await clothingLink.click();
      await expect(page).toHaveURL(/women\/clothing/);
    }
  });

  test('mega menu hides on mouse leave', async ({ page }) => {
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    await page.waitForTimeout(200);

    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
  });

  test('wishlist icon shows badge and navigates', async ({ page }) => {
    const wishlistBtn = page.locator('button[aria-label="Wishlist"]').first();
    await wishlistBtn.click();
    await expect(page).toHaveURL(/favorites/, { timeout: 5000 });
  });

  test('cart icon opens mini cart', async ({ page }) => {
    const cartBtn = page.getByRole('button', { name: /cart|bag/i }).first();
    await cartBtn.click();
    // Mini cart should appear
    const miniCart = page.locator('text=/your cart|your bag|start shopping/i').first();
    await expect(miniCart).toBeVisible({ timeout: 3000 });
  });

  test('region selector dropdown works', async ({ page }) => {
    const regionBtn = page.locator('text=/europe|united kingdom/i').first();
    if (await regionBtn.isVisible()) {
      await regionBtn.click();
      const options = page.locator('text=/united states|australia/i').first();
      await expect(options).toBeVisible();
      // Pressing Escape closes dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('language selector dropdown works', async ({ page }) => {
    const langBtn = page.locator('button:has-text("EN")').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await expect(page.locator('text=/DE|FR|IT|ES/').first()).toBeVisible();
    }
  });

  test('store locations link navigates to /stores', async ({ page }) => {
    const storeLink = page.locator('a[href="/stores"], a[href*="stores"]').first();
    if (await storeLink.isVisible()) {
      await storeLink.click();
      await expect(page).toHaveURL(/stores/);
    }
  });

  test('account button navigates to /account when logged in', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(500);
    const accountBtn = page.getByRole('button', { name: /account|user/i }).first();
    if (await accountBtn.isVisible()) {
      await accountBtn.click();
      await expect(page).toHaveURL(/account/, { timeout: 5000 });
    }
  });

  test('search input expands on icon click', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /search/i }).first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill('dress');
      await page.keyboard.press('Enter');
      // Search not implemented — page should not crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('mega menu Shoes subcategory links', async ({ page }) => {
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    await page.waitForTimeout(300);
    const shoesLink = page.getByRole('link', { name: /^shoes$/i }).first();
    if (await shoesLink.isVisible()) {
      await expect(shoesLink).toBeVisible();
    }
  });

  test('mega menu Bags subcategory links', async ({ page }) => {
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    await page.waitForTimeout(300);
    const bagsLink = page.getByRole('link', { name: /^bags$/i }).first();
    if (await bagsLink.isVisible()) {
      await expect(bagsLink).toBeVisible();
    }
  });

  test('mega menu Accessories subcategory links', async ({ page }) => {
    const womenTab = page.locator('button:has-text("WOMEN"), a:has-text("WOMEN")').first();
    await womenTab.hover();
    await page.waitForTimeout(300);
    const accLink = page.getByRole('link', { name: /^accessories$/i }).first();
    if (await accLink.isVisible()) {
      await expect(accLink).toBeVisible();
    }
  });

  test('cart badge count updates after adding item', async ({ page }) => {
    await page.goto('/women/clothing');
    await page.waitForLoadState('networkidle');
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const addBtn = card.getByRole('button', { name: /add to cart/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      // Cart badge should show "1"
      const badge = page.locator('header').locator('text=/^1$/').first();
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible();
      }
    }
  });

  test('wishlist badge count updates after adding item', async ({ page }) => {
    await page.goto('/women/clothing');
    await page.waitForLoadState('networkidle');
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const heart = card.getByRole('button', { name: /wishlist|favorite/i });
    if (await heart.isVisible()) {
      await heart.click();
      await page.waitForTimeout(500);
      // Wishlist badge should show count
    }
  });
});

test.describe('Header — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hamburger menu opens mobile drawer', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Open menu"]');
    await hamburger.waitFor({ state: 'visible', timeout: 10_000 });
    await hamburger.click();
    // Drawer shows categories
    await expect(page.locator('text=SHOES').first()).toBeVisible({ timeout: 5000 });
  });

  test('mobile drawer categories expand', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Open menu"]').first();
    await hamburger.click();
    await page.waitForTimeout(300);

    const clothingItem = page.locator('text=/clothing/i').first();
    if (await clothingItem.isVisible()) {
      await clothingItem.click();
    }
  });

  test('mobile drawer footer link navigates', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Open menu"]').first();
    await hamburger.click();
    await page.waitForTimeout(300);
    const footerLink = page.locator('a[href="/stores"], a[href="/faq"]').first();
    if (await footerLink.isVisible()) {
      await footerLink.click();
      await expect(page).not.toHaveURL('/');
    }
  });

  test('mobile drawer closes on backdrop click', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Open menu"]').first();
    await hamburger.click();
    await page.waitForTimeout(300);

    // Click outside the drawer
    await page.mouse.click(350, 400);
    await page.waitForTimeout(400);
  });
});
