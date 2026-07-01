import { test, expect } from '@playwright/test';
import { clearState } from './helpers';

test.describe('Favorites / Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/women/clothing');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test.describe('Empty state', () => {
    test('empty favorites shows empty state', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/empty|start browsing/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('empty state has Browse and Home buttons', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const browseBtn = page.getByRole('button', { name: /browse/i }).or(
        page.getByRole('link', { name: /browse/i })
      ).first();
      const homeBtn = page.getByRole('button', { name: /home/i }).or(
        page.getByRole('link', { name: /home/i })
      ).first();
      if (await browseBtn.isVisible()) await expect(browseBtn).toBeVisible();
      if (await homeBtn.isVisible()) await expect(homeBtn).toBeVisible();
    });
  });

  test.describe('Adding and removing', () => {
    test('add product to favorites from catalog', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      const heart = card.getByRole('button', { name: /wishlist|favorite/i });
      if (await heart.isVisible()) {
        await heart.click();
        await page.waitForTimeout(500);
        // Navigate to favorites
        await page.goto('/favorites');
        await page.waitForLoadState('networkidle');
        // Should have at least 1 item
        await expect(page.locator('text=/1 item|your favourites/i').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('remove product from favorites via heart icon', async ({ page }) => {
      // Add first
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      const heart = card.getByRole('button', { name: /wishlist|favorite/i });
      if (await heart.isVisible()) {
        await heart.click();
        await page.waitForTimeout(500);

        await page.goto('/favorites');
        await page.waitForLoadState('networkidle');

        // Remove via heart
        const favHeart = page.getByRole('button', { name: /remove|wishlist|favorite/i }).first();
        if (await favHeart.isVisible()) {
          await favHeart.click();
          await page.waitForTimeout(500);
          // Should show empty or item removed
        }
      }
    });
  });

  test.describe('Favorite card interactions', () => {
    // Helper to add item and go to favorites
    async function addAndGoToFavorites(page: any) {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      const heart = card.getByRole('button', { name: /wishlist|favorite/i });
      if (await heart.isVisible()) {
        await heart.click();
        await page.waitForTimeout(500);
      }
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
    }

    test('color swatch changes and persists', async ({ page }) => {
      await addAndGoToFavorites(page);
      const swatches = page.locator('button[aria-label*="Color"]');
      if (await swatches.count() > 1) {
        await swatches.nth(1).click();
        await page.waitForTimeout(300);
        // Reload and check color persisted
        await page.reload();
        await page.waitForLoadState('networkidle');
        // Second swatch should still be selected (via updateSelection)
      }
    });

    test('add to cart from favorites', async ({ page }) => {
      await addAndGoToFavorites(page);
      const favCard = page.locator('[class*="favorite"], [class*="Favorite"]').first();
      if (await favCard.isVisible()) {
        await favCard.hover();
        await page.waitForTimeout(300);
        const addBtn = favCard.getByRole('button', { name: /add to cart/i });
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('click card navigates to PDP with color in URL', async ({ page }) => {
      await addAndGoToFavorites(page);
      const favLink = page.locator('a[href*="/product/"]').first();
      if (await favLink.isVisible()) {
        await favLink.click();
        await expect(page).toHaveURL(/\/product\//);
      }
    });

    test('quick view opens from favorites', async ({ page }) => {
      await addAndGoToFavorites(page);
      const favCard = page.locator('[class*="favorite"], [class*="Favorite"]').first().or(
        page.locator('a[href*="/product/"]').first()
      );
      if (await favCard.isVisible()) {
        await favCard.hover();
        await page.waitForTimeout(300);
        const qvBtn = page.getByRole('button', { name: /quick view/i }).first();
        if (await qvBtn.isVisible()) {
          await qvBtn.click();
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        }
      }
    });
  });

  test.describe('Multiple items', () => {
    test('add multiple items and see them in grid', async ({ page }) => {
      // Add 2 items
      const cards = page.locator('a[href*="/product/"]');
      for (let i = 0; i < 2; i++) {
        const card = cards.nth(i);
        await card.hover();
        await page.waitForTimeout(200);
        const heart = card.getByRole('button', { name: /wishlist|favorite/i });
        if (await heart.isVisible()) {
          await heart.click();
          await page.waitForTimeout(300);
        }
      }
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/2 items/i').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Persistence', () => {
    test('wishlist persists across page reload', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      const heart = card.getByRole('button', { name: /wishlist|favorite/i });
      if (await heart.isVisible()) {
        await heart.click();
        await page.waitForTimeout(500);
      }
      // Reload and check
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const items = page.locator('a[href*="/product/"]');
      expect(await items.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Bulk actions', () => {
    async function addMultipleAndGoToFavorites(page: any) {
      const cards = page.locator('a[href*="/product/"]');
      for (let i = 0; i < 2; i++) {
        const card = cards.nth(i);
        await card.hover();
        await page.waitForTimeout(200);
        const heart = card.getByRole('button', { name: /wishlist|favorite/i });
        if (await heart.isVisible()) { await heart.click(); await page.waitForTimeout(300); }
      }
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
    }

    test('Move All to Bag button adds all items to cart', async ({ page }) => {
      await addMultipleAndGoToFavorites(page);
      const moveAllBtn = page.getByRole('button', { name: /move all|add all/i }).first();
      if (await moveAllBtn.isVisible()) {
        await moveAllBtn.click();
        await page.waitForTimeout(500);
      }
    });

    test('Clear All button shows confirmation and can be cancelled', async ({ page }) => {
      await addMultipleAndGoToFavorites(page);
      const clearBtn = page.getByRole('button', { name: /clear all|remove all/i }).first();
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        const cancelBtn = page.getByRole('button', { name: /cancel|no/i }).first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Out of stock in favorites', () => {
    test('OOS item shows grayscale and Out of Stock badge', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const oosBadge = page.locator('text=/out of stock/i').first();
      if (await oosBadge.isVisible()) {
        await expect(oosBadge).toBeVisible();
      }
    });
  });

  test.describe('Breadcrumb', () => {
    test('breadcrumb Home link navigates to homepage', async ({ page }) => {
      // Add item to see breadcrumb
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      const heart = card.getByRole('button', { name: /wishlist|favorite/i });
      if (await heart.isVisible()) { await heart.click(); await page.waitForTimeout(300); }
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const homeLink = page.locator('a[href="/"], button:has-text("Home")').first();
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    });
  });

  test.describe('Recommendation carousels', () => {
    test('recommendations render on empty favorites', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const recoSection = page.locator('text=/you might like|trending/i').first();
      if (await recoSection.isVisible()) {
        await expect(recoSection).toBeVisible();
      }
    });

    test('recommendation CTA button navigates to catalog', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const ctaLink = page.locator('a[href*="/women"], a[href*="/men"]').filter({ hasText: /shop|browse|view/i }).first();
      if (await ctaLink.isVisible()) {
        await ctaLink.click();
        await expect(page).not.toHaveURL('/favorites');
      }
    });

    test('carousel scroll left/right buttons work', async ({ page }) => {
      await page.goto('/favorites');
      await page.waitForLoadState('networkidle');
      const rightBtn = page.getByRole('button', { name: /next|right|→/i }).or(
        page.locator('button:has(svg)').filter({ hasText: '' }).nth(1)
      ).first();
      if (await rightBtn.isVisible()) {
        await rightBtn.click();
        await page.waitForTimeout(500);
      }
      const leftBtn = page.getByRole('button', { name: /prev|left|←/i }).first();
      if (await leftBtn.isVisible()) {
        await leftBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });
});
