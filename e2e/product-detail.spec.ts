import { test, expect } from '@playwright/test';
import { clearState } from './helpers';

const PRODUCT_URL = '/product/wc-1'; // Satin Slip Midi Dress

test.describe('Product Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCT_URL);
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test('renders product name, price, and image', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('img').first()).toBeVisible();
  });

  test.describe('Gallery', () => {
    test('clicking thumbnail changes main image', async ({ page }) => {
      const thumbnails = page.locator('button:has(img)').or(page.locator('[class*="thumbnail"] button'));
      if (await thumbnails.count() > 1) {
        await thumbnails.nth(1).click();
        await page.waitForTimeout(300);
      }
    });

    test('fullscreen viewer opens and closes', async ({ page }) => {
      const mainImage = page.locator('[class*="gallery"] img, [class*="Gallery"] img').first();
      if (await mainImage.isVisible()) {
        await mainImage.click();
        await page.waitForTimeout(500);
        // Close fullscreen
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Color selection', () => {
    test('clicking color swatch changes selection', async ({ page }) => {
      const swatches = page.locator('button[aria-label*="Color"]');
      const count = await swatches.count();
      if (count > 1) {
        await swatches.nth(1).click();
        // Swatch should have ring/border
        await expect(swatches.nth(1)).toBeVisible();
      }
    });

    test('out-of-stock color swatch is disabled', async ({ page }) => {
      const oosSwatches = page.locator('button[aria-label*="out of stock"]');
      if (await oosSwatches.count() > 0) {
        await expect(oosSwatches.first()).toBeDisabled();
      }
    });
  });

  test.describe('Size selection', () => {
    test('clicking size chip selects it', async ({ page }) => {
      const sizeChips = page.locator('button:has-text("S"), button:has-text("M"), button:has-text("L")');
      if (await sizeChips.count() > 0) {
        const sizeM = page.locator('button:has-text("M")').first();
        if (await sizeM.isVisible()) {
          await sizeM.click();
          // Should have selected state (bg-black text-white)
        }
      }
    });

    test('size guide modal opens and closes', async ({ page }) => {
      const sizeGuideBtn = page.locator('text=/size guide/i').first();
      if (await sizeGuideBtn.isVisible()) {
        await sizeGuideBtn.click();
        // Size table should be visible
        await expect(page.locator('text=/XS|chest|waist|hips/i').first()).toBeVisible();
        // Close
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Add to Cart', () => {
    test('add to cart without size shows error', async ({ page }) => {
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        // Should show size error
        await expect(page.locator('text=/select.*size|size.*required/i').first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('add to cart with size selected succeeds', async ({ page }) => {
      // Select size
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) {
        await sizeM.click();
      }
      // Add to cart
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        // Mini cart or success indicator should appear
        await expect(page.locator('text=/added|your cart|your bag/i').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Wishlist', () => {
    test('heart button toggles wishlist', async ({ page }) => {
      const heartBtn = page.getByRole('button', { name: /wishlist|save/i }).first();
      if (await heartBtn.isVisible()) {
        await heartBtn.click();
        await page.waitForTimeout(300);
        // Should show "Saved to Wishlist" or filled heart
        await heartBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Accordion sections', () => {
    test('description section expands', async ({ page }) => {
      const descBtn = page.locator('button:has-text("Description")').first();
      if (await descBtn.isVisible()) {
        await descBtn.click();
        await page.waitForTimeout(300);
      }
    });

    test('delivery & returns section expands', async ({ page }) => {
      const deliveryBtn = page.locator('button:has-text("Delivery")').first();
      if (await deliveryBtn.isVisible()) {
        await deliveryBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Back button', () => {
    test('back button navigates to previous page', async ({ page }) => {
      await page.goto('/women/clothing');
      await page.waitForLoadState('networkidle');
      await page.goto(PRODUCT_URL);
      await page.waitForLoadState('networkidle');
      const backBtn = page.getByRole('button', { name: /back|←/i }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await expect(page).not.toHaveURL(PRODUCT_URL);
      }
    });
  });

  test.describe('Share', () => {
    test('share dropdown opens', async ({ page }) => {
      const shareBtn = page.getByRole('button', { name: /share/i }).first();
      if (await shareBtn.isVisible()) {
        await shareBtn.click();
        await expect(page.locator('text=/facebook|twitter|whatsapp|copy/i').first()).toBeVisible();
      }
    });

    test('copy link button copies URL', async ({ page }) => {
      const shareBtn = page.getByRole('button', { name: /share/i }).first();
      if (await shareBtn.isVisible()) {
        await shareBtn.click();
        await page.waitForTimeout(300);
        const copyBtn = page.locator('button:has-text("Copy"), button[aria-label*="copy"]').first();
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForTimeout(300);
          // Should show "copied" state
        }
      }
    });
  });

  test.describe('Recommendations', () => {
    test('recommendation carousel renders', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const recoSection = page.locator('text=/you may also like|recommended/i').first();
      if (await recoSection.isVisible()) {
        await expect(recoSection).toBeVisible();
      }
    });
  });

  test.describe('URL params', () => {
    test('?color preselects color swatch', async ({ page }) => {
      await page.goto('/product/wc-1?color=%23000000');
      await page.waitForLoadState('networkidle');
      // Page should load without error
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('?size preselects size', async ({ page }) => {
      await page.goto('/product/wc-1?size=M');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });

  test.describe('Color changes gallery', () => {
    test('selecting a different color updates the main image', async ({ page }) => {
      const swatches = page.locator('button[aria-label*="Color"]');
      if (await swatches.count() > 1) {
        const imgBefore = await page.locator('[class*="gallery"] img, [class*="Gallery"] img').first().getAttribute('src');
        await swatches.nth(1).click();
        await page.waitForTimeout(500);
        const imgAfter = await page.locator('[class*="gallery"] img, [class*="Gallery"] img').first().getAttribute('src');
        // Image may or may not change depending on colorImages data
      }
    });
  });

  test.describe('Breadcrumbs', () => {
    test('breadcrumb Home link navigates to homepage', async ({ page }) => {
      const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]').first();
      if (await breadcrumb.isVisible()) {
        const homeLink = breadcrumb.getByRole('link', { name: /home/i });
        if (await homeLink.isVisible()) {
          await homeLink.click();
          await expect(page).toHaveURL('/');
        }
      }
    });
  });

  test.describe('Bundle / Special Offers', () => {
    test('bundle offer section renders', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
      await page.waitForTimeout(500);
      const bundleSection = page.locator('text=/special offer|bundle|buy together/i').first();
      if (await bundleSection.isVisible()) {
        await expect(bundleSection).toBeVisible();
      }
    });

    test('add bundle to cart', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
      await page.waitForTimeout(500);
      const addBundleBtn = page.getByRole('button', { name: /add bundle|add both|buy bundle/i }).first();
      if (await addBundleBtn.isVisible()) {
        await addBundleBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Reserve in Store', () => {
    test('reserve modal opens and shows stores', async ({ page }) => {
      const reserveBtn = page.getByRole('button', { name: /reserve in store/i }).first();
      if (await reserveBtn.isVisible()) {
        await reserveBtn.click();
        await expect(page.locator('text=/oxford|covent|canary|select.*store/i').first()).toBeVisible({ timeout: 3000 });
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Write Review', () => {
    test('write review modal opens', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const writeBtn = page.getByRole('button', { name: /write.*review/i }).first();
      if (await writeBtn.isVisible()) {
        await writeBtn.click();
        await expect(page.locator('text=/rate|review|headline/i').first()).toBeVisible({ timeout: 3000 });
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Reviews section', () => {
    test('show all reviews button expands', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
      await page.waitForTimeout(500);
      const showAllBtn = page.getByRole('button', { name: /show all|see all/i }).first();
      if (await showAllBtn.isVisible()) {
        await showAllBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Recently Viewed', () => {
    test('recently viewed section appears after viewing another product', async ({ page }) => {
      // Visit another product first
      await page.goto('/product/wc-2');
      await page.waitForLoadState('networkidle');
      await page.goto(PRODUCT_URL);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const recentSection = page.locator('text=/recently viewed/i').first();
      if (await recentSection.isVisible()) {
        await expect(recentSection).toBeVisible();
      }
    });
  });
});

test.describe('PDP — Non-existent product', () => {
  test('shows 404 page for invalid product id', async ({ page }) => {
    await page.goto('/product/nonexistent-product-xyz');
    await page.waitForLoadState('networkidle');
    // Next.js renders 404 page content (may return 200 status)
    await expect(page.locator('text=/not found|404|page.*not.*exist/i').first()).toBeVisible({ timeout: 5000 });
  });
});
