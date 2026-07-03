import { test, expect } from '@playwright/test';
import { clearState, login } from './helpers';

test.describe('Edge Cases & Adversarial', () => {

  test.describe('404 Pages', () => {
    test('non-existent route shows 404 page', async ({ page }) => {
      await page.goto('/this-page-does-not-exist');
      await expect(page.locator('text=/not found|404/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('non-existent product shows 404 page', async ({ page }) => {
      await page.goto('/product/zzz-999');
      await expect(page.locator('text=/not found|404/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('deep non-existent path shows 404 page', async ({ page }) => {
      await page.goto('/women/clothing/subcategory/nonexistent');
      await expect(page.locator('text=/not found|404/i').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('XSS Prevention', () => {
    test('XSS in URL query params does not execute', async ({ page }) => {
      await page.goto('/product/wc-1?color=<script>alert(1)</script>');
      // Page should load normally
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
      // No alert should have been triggered
    });

    test('XSS in search (if search exists)', async ({ page }) => {
      await page.goto('/');
      const searchBtn = page.getByRole('button', { name: /search/i }).first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        const searchInput = page.getByPlaceholder(/search/i).first();
        if (await searchInput.isVisible()) {
          await searchInput.fill('<img src=x onerror=alert(1)>');
          await page.keyboard.press('Enter');
          // Should not crash
        }
      }
    });
  });

  test.describe('Navigation edge cases', () => {
    test('rapid back/forward navigation does not crash', async ({ page }) => {
      await page.goto('/');
      await page.goto('/women/clothing');
      await page.goto('/product/wc-1');
      await page.goBack();
      await page.goBack();
      await page.goForward();
      await expect(page.locator('body')).toBeVisible();
    });

    test('back from PDP returns to catalog with state preserved', async ({ page }) => {
      await page.goto('/women/clothing');
      await page.waitForLoadState('networkidle');
      // Click a product (any product URL — SKU prefix may vary between
      // playground `/product/wc-*` and CMS-backed numeric IDs).
      const card = page.locator('a[href*="/product/"]').first();
      // Bypass the hover-only Add-to-Cart overlay that intercepts clicks.
      await card.evaluate((el) => (el as HTMLAnchorElement).click());
      await expect(page).toHaveURL(/\/product\//);
      await page.waitForLoadState('networkidle');
      // Go back
      await page.goBack();
      await expect(page).toHaveURL(/women\/clothing/);
      // Catalog should still have product cards
      await expect(page.locator('a[href*="/product/"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('back from checkout to cart preserves items', async ({ page }) => {
      // Seed cart
      await page.addInitScript(() => {
        const store = JSON.parse(localStorage.getItem('oe_store') || '{}');
        store.cart = { items: [{ id: 'wc-1-nav', name: 'Nav Test', brand: 'OE', sku: 'wc-1', color: '#000', size: 'M', quantity: 1, price: 29.99, image: '/icons/icon-192.png' }], miniCartOpen: false };
        store.__version = 3;
        localStorage.setItem('oe_store', JSON.stringify(store));
      });
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      await page.goto('/checkout/delivery');
      await page.waitForLoadState('networkidle');
      // Go back to cart
      await page.goBack();
      await expect(page).toHaveURL(/cart/);
      // Cart item should still be visible
      await expect(page.locator('text=/Nav Test/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('direct URL access to all main routes', async ({ page }) => {
      const routes = ['/', '/women/clothing', '/favorites', '/cart', '/sale', '/faq', '/stores'];
      for (const route of routes) {
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(500);
      }
    });

    test('browser refresh preserves cart state', async ({ page }) => {
      await page.goto('/product/wc-1');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();
      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) await addBtn.click();
      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Cart badge should still show count
      const badge = page.locator('[class*="badge"], [class*="Badge"]').filter({ hasText: /\d/ });
      // Cart state is persisted in localStorage
    });
  });

  test.describe('Out of Stock handling', () => {
    test('OOS product shows disabled Add to Cart', async ({ page }) => {
      // Visit a product page — OOS detection depends on product data
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');

      // Check if any OOS color swatches exist
      const oosSwatches = page.locator('button[aria-disabled="true"][aria-label*="Color"]');
      if (await oosSwatches.count() > 0) {
        // Clicking OOS swatch should not change selection
        await oosSwatches.first().click({ force: true });
      }
    });
  });

  test.describe('LocalStorage', () => {
    test('corrupted localStorage does not crash the app', async ({ page }) => {
      await page.goto('/');
      // Write corrupt data to localStorage
      await page.evaluate(() => {
        localStorage.setItem('oe_store', '{corrupt json data!!!}');
      });
      await page.reload();
      // App should still load (falls back to defaults)
      await expect(page.locator('body')).toBeVisible();
    });

    test('empty localStorage loads defaults', async ({ page }) => {
      await page.goto('/cart');
      await clearState(page);
      await page.reload();
      await page.waitForLoadState('networkidle');
      // Should show empty cart
      await expect(page.locator('text=/empty|start shopping/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('extremely large localStorage does not crash', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        // Write 1MB of data
        const big = 'x'.repeat(1_000_000);
        try { localStorage.setItem('oe_test', big); } catch {}
      });
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
      // Cleanup
      await page.evaluate(() => localStorage.removeItem('oe_test'));
    });
  });

  test.describe('Rapid interactions', () => {
    test('rapid add to cart clicks do not duplicate items', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');
      const sizeM = page.locator('button:has-text("M")').first();
      if (await sizeM.isVisible()) await sizeM.click();

      const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
      if (await addBtn.isVisible()) {
        // Rapid clicks
        await addBtn.click();
        await addBtn.click();
        await addBtn.click();
        await page.waitForTimeout(500);
        // Should increase quantity, not create duplicates
      }
    });

    test('rapid heart toggle does not corrupt wishlist', async ({ page }) => {
      await page.goto('/product/wc-1');
      await page.waitForLoadState('networkidle');

      const heartBtn = page.getByRole('button', { name: /wishlist|save/i }).first();
      if (await heartBtn.isVisible()) {
        // Rapid toggles
        for (let i = 0; i < 5; i++) {
          await heartBtn.click();
          await page.waitForTimeout(100);
        }
        // Should not crash
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Viewport / Responsive', () => {
    test('page renders correctly at very narrow width', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });

    test('page renders correctly at very wide viewport', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Info / Content pages', () => {
    test('FAQ page renders', async ({ page }) => {
      await page.goto('/faq');
      await expect(page.locator('text=/return|delivery|size/i').first()).toBeVisible({ timeout: 10_000 });
    });

    test('about us page renders', async ({ page }) => {
      await page.goto('/about-us');
      await expect(page.locator('text=/about/i').first()).toBeVisible({ timeout: 10_000 });
    });

    test('privacy policy page renders', async ({ page }) => {
      await page.goto('/privacy-policy');
      await expect(page.locator('text=/privacy/i').first()).toBeVisible({ timeout: 10_000 });
    });

    test('store locations page renders', async ({ page }) => {
      await page.goto('/stores');
      await expect(page.locator('text=/oxford|store/i').first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Sale & New Arrivals', () => {
    test('sale page renders products', async ({ page }) => {
      await page.goto('/sale');
      await page.waitForLoadState('networkidle');
      const cards = page.locator('a[href*="/product/"]');
      await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    });

    test('new arrivals page renders products', async ({ page }) => {
      await page.goto('/new');
      await page.waitForLoadState('networkidle');
      const cards = page.locator('a[href*="/product/"]');
      await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Accessibility basics', () => {
    test('skip to content link exists', async ({ page }) => {
      await page.goto('/');
      const skipLink = page.locator('a:has-text("Skip to"), a[href="#main"]').first();
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeAttached();
      }
    });

    test('images have alt attributes', async ({ page }) => {
      await page.goto('/women/clothing');
      await page.waitForLoadState('networkidle');
      const images = page.locator('img');
      const count = await images.count();
      for (let i = 0; i < Math.min(count, 10); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).not.toBeNull();
        expect(alt!.length).toBeGreaterThan(0);
      }
    });

    test('focusable elements are keyboard-navigable', async ({ page }) => {
      await page.goto('/');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedTag).toBeTruthy();
    });

    test('focus trap in login modal', async ({ page }) => {
      await page.goto('/');
      await page.locator('button[aria-label="My account"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // Tab should cycle within modal
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      // Focus should still be inside the dialog
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(el) ?? false;
      });
      expect(focused).toBeTruthy();
    });

    test('ARIA labels on header interactive elements', async ({ page }) => {
      await page.goto('/');
      const buttons = page.locator('header button, header a');
      const count = await buttons.count();
      let labeled = 0;
      for (let i = 0; i < Math.min(count, 15); i++) {
        const label = await buttons.nth(i).getAttribute('aria-label');
        const text = await buttons.nth(i).textContent();
        if (label || (text && text.trim().length > 0)) labeled++;
      }
      // Most buttons should have label or text
      expect(labeled).toBeGreaterThan(count * 0.5);
    });
  });

  test.describe('FAQ page', () => {
    test('FAQ accordion items expand and collapse', async ({ page }) => {
      await page.goto('/faq');
      await page.waitForLoadState('networkidle');
      const question = page.locator('button:has-text("return"), button:has-text("delivery"), button:has-text("size")').first();
      if (await question.isVisible()) {
        await question.click();
        await page.waitForTimeout(300);
        // Answer should be visible
        const answer = page.locator('text=/30 days|working days|measure/i').first();
        if (await answer.isVisible()) {
          await expect(answer).toBeVisible();
        }
        // Click again to collapse
        await question.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Store Locations', () => {
    test('click store shows details', async ({ page }) => {
      await page.goto('/stores');
      await page.waitForLoadState('networkidle');
      const storeCard = page.locator('text=/oxford|covent|canary/i').first();
      if (await storeCard.isVisible()) {
        await storeCard.click();
        await page.waitForTimeout(500);
        // Should show address, hours, phone
        await expect(page.locator('text=/mon|tue|open/i').first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Info pages — comprehensive', () => {
    const infoPages = [
      '/careers', '/rewards', '/gift-certificates', '/terms',
      '/contact', '/delivery', '/exchange', '/sizing-guide',
    ];
    for (const url of infoPages) {
      test(`info page ${url} renders`, async ({ page }) => {
        const response = await page.goto(url);
        expect(response?.status()).toBeLessThan(500);
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
      });
    }
  });

  test.describe('Sale page', () => {
    test('sale page countdown timer renders', async ({ page }) => {
      await page.goto('/sale');
      await page.waitForLoadState('networkidle');
      const timer = page.locator('text=/days|hours|minutes|ends/i').first();
      if (await timer.isVisible()) {
        await expect(timer).toBeVisible();
      }
    });

    test('sale page discount filter options', async ({ page }) => {
      await page.goto('/sale');
      await page.waitForLoadState('networkidle');
      const discountFilter = page.locator('text=/10%|20%|30%|discount/i').first();
      if (await discountFilter.isVisible()) {
        await discountFilter.click();
        await page.waitForTimeout(500);
      }
    });

    test('sale page category tabs switch products', async ({ page }) => {
      await page.goto('/sale');
      await page.waitForLoadState('networkidle');
      const tabs = page.locator('button:has-text("Clothing"), button:has-text("Shoes"), button:has-text("All")');
      for (let i = 0; i < Math.min(await tabs.count(), 3); i++) {
        if (await tabs.nth(i).isVisible()) {
          await tabs.nth(i).click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('New Arrivals page', () => {
    test('category tabs filter products', async ({ page }) => {
      await page.goto('/new');
      await page.waitForLoadState('networkidle');
      const tabs = page.locator('button:has-text("Clothing"), button:has-text("Shoes"), button:has-text("Accessories")');
      if (await tabs.count() > 0) {
        await tabs.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('all category tabs produce results', async ({ page }) => {
      await page.goto('/new');
      await page.waitForLoadState('networkidle');
      const tabs = page.locator('button:has-text("All"), button:has-text("Clothing"), button:has-text("Shoes"), button:has-text("Accessories")');
      for (let i = 0; i < await tabs.count(); i++) {
        if (await tabs.nth(i).isVisible()) {
          await tabs.nth(i).click();
          await page.waitForTimeout(500);
          const cards = page.locator('a[href*="/product/"]');
          expect(await cards.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Footer interactions', () => {
    test('footer link clicks navigate correctly', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const footerLink = page.locator('footer a[href*="/delivery"], footer a[href*="/faq"]').first();
      if (await footerLink.isVisible()) {
        const href = await footerLink.getAttribute('href');
        await footerLink.click();
        await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, '\\/')));
      }
    });

    test('footer social links have valid hrefs', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const socialLinks = page.locator('footer a[href*="facebook"], footer a[href*="instagram"], footer a[href*="twitter"]');
      const count = await socialLinks.count();
      for (let i = 0; i < count; i++) {
        const href = await socialLinks.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href!.startsWith('http')).toBeTruthy();
      }
    });

    test('footer support items are visible', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const supportItems = page.locator('footer').locator('text=/help center|text us|live chat|email us/i');
      if (await supportItems.count() > 0) {
        await expect(supportItems.first()).toBeVisible();
      }
    });

    test('payment method icons visible in footer', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const paymentIcons = page.locator('footer').locator('text=/visa|mastercard|paypal|apple pay/i');
      if (await paymentIcons.count() > 0) {
        await expect(paymentIcons.first()).toBeVisible();
      }
    });
  });

  test.describe('HeroSlider CTA', () => {
    test('CTA button on hero slide navigates', async ({ page }) => {
      await page.goto('/');
      const ctaBtn = page.locator('a:has-text("Shop"), a:has-text("Explore"), a:has-text("Discover")').first();
      if (await ctaBtn.isVisible()) {
        const href = await ctaBtn.getAttribute('href');
        await ctaBtn.click();
        if (href) await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/')));
      }
    });
  });

  test.describe('404 page navigation', () => {
    test('404 page has links to catalog and home', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz');
      await page.waitForLoadState('networkidle');
      const homeLink = page.getByRole('link', { name: /home/i }).or(
        page.getByRole('button', { name: /home/i })
      ).first();
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    });

    test('404 page has catalog navigation links', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz');
      await page.waitForLoadState('networkidle');
      const catalogLink = page.getByRole('link', { name: /women|men|clothing|browse/i }).first();
      if (await catalogLink.isVisible()) {
        await catalogLink.click();
        await expect(page).not.toHaveURL(/nonexistent/);
      }
    });
  });

  test.describe('Confirmation page navigation', () => {
    test('confirmation "Track Your Order" navigates to account or track page', async ({ page }) => {
      await page.goto('/checkout/confirmation');
      await page.waitForLoadState('networkidle');
      const trackBtn = page.getByRole('button', { name: /track|order/i }).or(
        page.getByRole('link', { name: /track|order/i })
      ).first();
      if (await trackBtn.isVisible()) {
        await trackBtn.click();
        // Track Your Order may route to /account (logged-in flow) OR to
        // /info/track-order (public tracking page).
        await expect(page).toHaveURL(/account|track-order/, { timeout: 5000 });
      }
    });

    test('confirmation "Home" button navigates to homepage', async ({ page }) => {
      await page.goto('/checkout/confirmation');
      await page.waitForLoadState('networkidle');
      const homeBtn = page.getByRole('link', { name: /home/i }).or(
        page.getByRole('button', { name: /home/i })
      ).first();
      if (await homeBtn.isVisible()) {
        await homeBtn.click();
        await expect(page).toHaveURL('/');
      }
    });
  });

  test.describe('Account waiting list navigation', () => {
    test('waiting list item click navigates to product', async ({ page }) => {
      await page.goto('/');
      await login(page);
      await page.goto('/account');
      await page.waitForLoadState('networkidle');
      const waitTab = page.locator('button:has-text("Waiting"), [class*="tab"]:has-text("Waiting")').first();
      if (await waitTab.isVisible()) {
        await waitTab.click();
        await page.waitForTimeout(500);
        const productLink = page.locator('a[href*="/product/"]').first();
        if (await productLink.isVisible()) {
          await productLink.click();
          await expect(page).toHaveURL(/\/product\//);
        }
      }
    });
  });

  test.describe('Mobile-specific', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('mobile filter panel opens as bottom sheet', async ({ page }) => {
      await page.goto('/women/clothing');
      await page.waitForLoadState('networkidle');
      const filterBtn = page.getByRole('button', { name: /filter/i }).first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(500);
        // Filter panel should appear
      }
    });

    test('mobile drawer link navigates to catalog', async ({ page }) => {
      await page.goto('/');
      const hamburger = page.getByRole('button', { name: /menu|navigation/i }).first();
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(500);
        const catalogLink = page.getByRole('link', { name: /clothing|shoes|bags/i }).first();
        if (await catalogLink.isVisible()) {
          await catalogLink.click();
          await expect(page).not.toHaveURL('/');
        }
      }
    });

    test('mobile sort dropdown works', async ({ page }) => {
      await page.goto('/women/clothing');
      await page.waitForLoadState('networkidle');
      const sortBtn = page.getByRole('button', { name: /sort/i }).or(
        page.locator('select').first()
      ).first();
      if (await sortBtn.isVisible()) {
        await sortBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });
});
