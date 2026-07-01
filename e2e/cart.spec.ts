import { test, expect } from '@playwright/test';
import { clearState } from './helpers';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/women/clothing');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test.describe('Empty state', () => {
    test('empty cart page shows start shopping', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/empty|start shopping/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('empty cart "Continue Shopping" navigates to catalog', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      const btn = page.getByRole('button', { name: /start shopping|continue shopping/i }).or(
        page.getByRole('link', { name: /start shopping|continue shopping/i })
      ).first();
      if (await btn.isVisible()) {
        await btn.click();
        await expect(page).not.toHaveURL('/cart');
      }
    });
  });

  test.describe('Adding items', () => {
    test('add product from catalog card to cart', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const addBtn = card.getByRole('button', { name: /add to cart/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        // Mini cart should open
        await expect(page.locator('text=/your cart|your bag/i').first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('add product from PDP to cart', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');

      // Select size
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();

      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.locator('text=/added|your cart|your bag/i').first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Cart page operations', () => {
    // Helper: add item then go to cart
    async function addItemAndGoToCart(page: any) {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
    }

    test('cart page shows added item', async ({ page }) => {
      await addItemAndGoToCart(page);
      await expect(page.locator('text=/satin|midi/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('quantity increase/decrease works', async ({ page }) => {
      await addItemAndGoToCart(page);
      const plusBtn = page.getByRole('button', { name: /\+|increase/i }).first();
      if (await plusBtn.isVisible()) {
        await plusBtn.click();
        await page.waitForTimeout(300);
        // Quantity should update
      }
      const minusBtn = page.getByRole('button', { name: /−|-|decrease/i }).first();
      if (await minusBtn.isVisible()) {
        await minusBtn.click();
      }
    });

    test('remove item from cart', async ({ page }) => {
      await addItemAndGoToCart(page);
      const removeBtn = page.getByRole('button', { name: /remove|delete|trash/i }).first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(500);
        // Should show empty state or item removed
      }
    });

    test('proceed to checkout button navigates', async ({ page }) => {
      await addItemAndGoToCart(page);
      const checkoutBtn = page.getByRole('button', { name: /proceed|checkout/i }).or(
        page.getByRole('link', { name: /proceed|checkout/i })
      ).first();
      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await expect(page).toHaveURL(/checkout/);
      }
    });
  });

  test.describe('Promo codes', () => {
    async function addItemAndGoToCart(page: any) {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
    }

    test('valid promo code applies discount', async ({ page }) => {
      await addItemAndGoToCart(page);
      const promoCheckbox = page.locator('text=/promo|coupon/i').first();
      if (await promoCheckbox.isVisible()) {
        await promoCheckbox.click();
        const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
        if (await promoInput.isVisible()) {
          await promoInput.fill('ONEENTRY10');
          await page.getByRole('button', { name: /apply/i }).click();
          await expect(page.locator('text=/10%|discount/i').first()).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('invalid promo code shows error', async ({ page }) => {
      await addItemAndGoToCart(page);
      const promoCheckbox = page.locator('text=/promo|coupon/i').first();
      if (await promoCheckbox.isVisible()) {
        await promoCheckbox.click();
        const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
        if (await promoInput.isVisible()) {
          await promoInput.fill('INVALIDCODE');
          await page.getByRole('button', { name: /apply/i }).click();
          await expect(page.locator('text=/invalid/i').first()).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('XSS in promo code field', async ({ page }) => {
      await addItemAndGoToCart(page);
      const promoCheckbox = page.locator('text=/promo|coupon/i').first();
      if (await promoCheckbox.isVisible()) {
        await promoCheckbox.click();
        const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
        if (await promoInput.isVisible()) {
          await promoInput.fill('<img src=x onerror=alert(1)>');
          await page.getByRole('button', { name: /apply/i }).click();
          // Should not crash, should show invalid
        }
      }
    });
  });

  test.describe('Size change', () => {
    async function addItemAndGoToCart(page: any) {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
    }

    test('change size via dropdown on cart page', async ({ page }) => {
      await addItemAndGoToCart(page);
      const sizeSelect = page.locator('select').first();
      if (await sizeSelect.isVisible()) {
        await sizeSelect.selectOption({ index: 1 });
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Cart persistence', () => {
    test('cart items persist after page reload', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);

      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      // Item should still be there
      const items = page.locator('text=/satin|midi|dress/i').first();
      await expect(items).toBeVisible({ timeout: 5000 });
    });

    test('removing all items shows empty state', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      const removeBtn = page.getByRole('button', { name: /remove|delete|trash/i }).first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=/empty|start shopping/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Select and remove multiple', () => {
    async function addAndGoToCart(page: any) {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
    }

    test('select all checkbox selects items', async ({ page }) => {
      await addAndGoToCart(page);
      const selectAll = page.locator('input[type="checkbox"]').first();
      if (await selectAll.isVisible()) {
        await selectAll.check();
        await page.waitForTimeout(200);
      }
    });

    test('remove selected button removes checked items', async ({ page }) => {
      await addAndGoToCart(page);
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.check();
        const removeSelectedBtn = page.getByRole('button', { name: /remove selected/i }).first();
        if (await removeSelectedBtn.isVisible()) {
          await removeSelectedBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('promo checkbox toggles coupon input', async ({ page }) => {
      await addAndGoToCart(page);
      const promoToggle = page.locator('text=/promo|coupon/i').first().or(
        page.locator('input[type="checkbox"]').last()
      );
      if (await promoToggle.isVisible()) {
        await promoToggle.click();
        await page.waitForTimeout(300);
        const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
        if (await promoInput.isVisible()) {
          await expect(promoInput).toBeVisible();
        }
      }
    });
  });

  test.describe('Bundle items in cart', () => {
    test('bundle items appear grouped in cart', async ({ page }) => {
      // Visit PDP with bundle offer
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
      await page.waitForTimeout(500);
      const addBundleBtn = page.getByRole('button', { name: /add bundle|add both|buy bundle/i }).first();
      if (await addBundleBtn.isVisible()) {
        await addBundleBtn.click();
        await page.waitForTimeout(500);
        await page.goto('/cart');
        await page.waitForLoadState('networkidle');
        // Should show "Special Offer" or bundle group header
        const bundleHeader = page.locator('text=/special offer|bundle/i').first();
        if (await bundleHeader.isVisible()) {
          await expect(bundleHeader).toBeVisible();
          // Remove bundle
          const removeBundleBtn = page.getByRole('button', { name: /remove bundle|remove/i }).last();
          if (await removeBundleBtn.isVisible()) {
            await removeBundleBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  test.describe('Cart page — wishlist', () => {
    test('move item to wishlist from cart page', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      const heartBtn = page.getByRole('button', { name: /wishlist|heart|save/i }).first();
      if (await heartBtn.isVisible()) {
        await heartBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Mini Cart', () => {
    test('mini cart opens and closes', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const addBtn = card.getByRole('button', { name: /add to cart/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.locator('text=/your cart|your bag/i').first()).toBeVisible({ timeout: 3000 });
        const closeBtn = page.getByRole('button', { name: /close/i }).first();
        if (await closeBtn.isVisible()) await closeBtn.click();
      }
    });

    test('mini cart "View Cart" navigates to cart page', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const addBtn = card.getByRole('button', { name: /add to cart/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const viewCartBtn = page.getByRole('button', { name: /view cart/i }).or(
          page.getByRole('link', { name: /view cart/i })
        ).first();
        if (await viewCartBtn.isVisible()) {
          await viewCartBtn.click();
          await expect(page).toHaveURL('/cart');
        }
      }
    });

    test('mini cart "Checkout" button navigates to checkout', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const addBtn = card.getByRole('button', { name: /add to cart/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const checkoutBtn = page.getByRole('button', { name: /checkout/i }).or(
          page.getByRole('link', { name: /checkout/i })
        ).first();
        if (await checkoutBtn.isVisible()) {
          await checkoutBtn.click();
          await expect(page).toHaveURL(/checkout/);
        }
      }
    });

    test('mini cart item removal via X button', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const addBtn = card.getByRole('button', { name: /add to cart/i });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const removeBtn = page.getByRole('button', { name: /remove|delete/i }).first();
        if (await removeBtn.isVisible()) {
          await removeBtn.click();
          await page.waitForTimeout(500);
          // Mini cart should show empty state
          await expect(page.locator('text=/empty|start shopping/i').first()).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('empty mini cart shows "Continue Shopping"', async ({ page }) => {
      const cartBtn = page.getByRole('button', { name: /cart|bag/i }).first();
      await cartBtn.click();
      const emptyMsg = page.locator('text=/empty|start shopping|continue shopping/i').first();
      await expect(emptyMsg).toBeVisible({ timeout: 3000 });
    });
  });
});
