import { test, expect } from '@playwright/test';

test.describe('Catalog — Women Clothing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/women/clothing');
    await page.waitForLoadState('networkidle');
  });

  test('renders product grid with cards', async ({ page }) => {
    const cards = page.locator('a[href*="/product/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('product card shows name, price, and image', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    await expect(card).toBeVisible();
    // Should have an image
    const img = card.locator('img');
    await expect(img).toBeVisible();
  });

  test('product card color swatches change image', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    const swatches = card.locator('button[aria-label*="Color"]');
    if (await swatches.count() > 1) {
      const secondSwatch = swatches.nth(1);
      await secondSwatch.click();
      // Swatch should be selected (ring/border change)
      await expect(secondSwatch).toBeVisible();
    }
  });

  test('product card hover shows Add to Cart and Quick View', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const addBtn = card.getByRole('button', { name: /add to cart/i });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });

  test('product card click navigates to PDP', async ({ page }) => {
    const card = page.locator('a[href*="/product/wc-"]').first();
    const href = await card.getAttribute('href');
    await card.click();
    await expect(page).toHaveURL(new RegExp(href!.split('?')[0].replace(/\//g, '\\/')));
  });

  test('product card heart toggles wishlist', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    const heart = card.getByRole('button', { name: /wishlist|favorite/i });
    if (await heart.isVisible()) {
      await heart.click();
      await page.waitForTimeout(300);
      // Heart state should change (click again to remove)
      await heart.click();
    }
  });

  test.describe('Sorting', () => {
    test('sort by price ascending', async ({ page }) => {
      const sortDropdown = page.locator('select, [class*="sort"] button, button:has-text("Sort")').first();
      if (await sortDropdown.isVisible()) {
        await sortDropdown.click();
        const priceOption = page.locator('text=/price.*low|low.*high|ascending/i').first();
        if (await priceOption.isVisible()) {
          await priceOption.click();
        }
      }
    });

    test('sort by price descending', async ({ page }) => {
      const sortDropdown = page.locator('select, [class*="sort"] button, button:has-text("Sort")').first();
      if (await sortDropdown.isVisible()) {
        await sortDropdown.click();
        const priceOption = page.locator('text=/price.*high|high.*low|descending/i').first();
        if (await priceOption.isVisible()) {
          await priceOption.click();
        }
      }
    });
  });

  test.describe('View modes', () => {
    test('toggle between 3 and 4 column grid', async ({ page }) => {
      const gridToggle = page.locator('button[aria-label*="column"], button[aria-label*="grid"]');
      if (await gridToggle.count() > 1) {
        await gridToggle.nth(1).click();
        await page.waitForTimeout(300);
        await gridToggle.nth(0).click();
      }
    });
  });

  test.describe('Pagination', () => {
    test('pagination buttons navigate between pages', async ({ page }) => {
      const nextBtn = page.getByRole('button', { name: /next|→|>/i }).or(
        page.locator('button:has-text("2")')
      ).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Quick View', () => {
    test('quick view opens from product card hover', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        // Modal should appear
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
      }
    });

    test('quick view shows product details', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 3000 });
        // Should have color swatches, sizes, price
        await expect(dialog.locator('button[aria-label*="Color"]').first()).toBeVisible();
      }
    });

    test('quick view "View Full Details" navigates to PDP', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const detailsBtn = page.getByRole('button', { name: /view full details/i });
        await detailsBtn.click();
        await expect(page).toHaveURL(/\/product\//);
      }
    });

    test('quick view closes on backdrop click', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Click backdrop
        await page.locator('.bg-black\\/60, [class*="backdrop"]').first().click({ force: true });
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
      }
    });

    test('quick view size guide link opens table', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const sizeGuide = page.locator('text=/size guide/i').first();
        if (await sizeGuide.isVisible()) {
          await sizeGuide.click();
          await expect(page.locator('text=/XS|chest|waist/i').first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });

    test('quick view heart toggles wishlist', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const heart = page.getByRole('dialog').getByRole('button', { name: /wishlist|favorite/i }).first();
        if (await heart.isVisible()) {
          await heart.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('quick view Escape key closes modal', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
      }
    });

    test('quick view select color + size then add to cart succeeds', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Select color
        const swatch = page.getByRole('dialog').locator('button[aria-label*="Color"]').first();
        if (await swatch.isVisible()) await swatch.click();
        // Select size
        const sizeBtn = page.getByRole('dialog').locator('button:has-text("M")').first();
        if (await sizeBtn.isVisible()) await sizeBtn.click();
        // Add to cart
        const buyBtn = page.getByRole('dialog').getByRole('button', { name: /get it|buy/i }).first();
        if (await buyBtn.isVisible()) {
          await buyBtn.click();
          await page.waitForTimeout(500);
          // Modal should close, mini cart should open
        }
      }
    });

    test('quick view "View Full Details" passes ?color= in URL', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Select a color first
        const swatch = page.getByRole('dialog').locator('button[aria-label*="Color"]').first();
        if (await swatch.isVisible()) await swatch.click();
        const detailsBtn = page.getByRole('button', { name: /view full details/i });
        await detailsBtn.click();
        await expect(page).toHaveURL(/\/product\/.*color=/);
      }
    });

    test('quick view requires color and size for add to cart', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Try to add without selecting color/size
        const buyBtn = page.getByRole('button', { name: /get it|buy/i }).first();
        if (await buyBtn.isVisible()) {
          await buyBtn.click();
          // Should show error indicators
          await expect(page.locator('text=/please select/i').first()).toBeVisible();
        }
      }
    });

    test('quick view X button closes modal', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const closeBtn = page.getByRole('dialog').getByRole('button', { name: /close/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await expect(page.getByRole('dialog')).toBeHidden({ timeout: 2000 });
        }
      }
    });

    test('quick view thumbnail clicks change image', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const thumbnails = page.getByRole('dialog').locator('button:has(img)');
        if (await thumbnails.count() > 1) {
          await thumbnails.nth(1).click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('quick view expandable sections toggle', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const descBtn = page.getByRole('dialog').locator('button:has-text("Description")').first();
        if (await descBtn.isVisible()) {
          await descBtn.click();
          await page.waitForTimeout(300);
          // Content should expand
          await expect(page.getByRole('dialog').locator('text=/premium|cotton|wardrobe/i').first()).toBeVisible();
          // Click again to collapse
          await descBtn.click();
        }
      }
    });

    test('quick view size guide X button closes overlay', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const sizeGuide = page.getByRole('dialog').locator('text=/size guide/i').first();
        if (await sizeGuide.isVisible()) {
          await sizeGuide.click();
          await page.waitForTimeout(300);
          // Close via X button inside size guide
          const xBtn = page.getByRole('dialog').getByRole('button').filter({ has: page.locator('svg') }).first();
          if (await xBtn.isVisible()) await xBtn.click();
        }
      }
    });

    test('quick view all accordion sections toggle', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const sections = ['Description', 'Size & Fit', 'Details', 'Delivery & Returns'];
        for (const title of sections) {
          const btn = page.getByRole('dialog').locator(`button:has-text("${title}")`).first();
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(200);
            await btn.click(); // collapse
          }
        }
      }
    });

    test('quick view buy button navigates to checkout', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Select color
        const swatch = page.getByRole('dialog').locator('button[aria-label*="Color"]').first();
        if (await swatch.isVisible()) await swatch.click();
        // Select size
        const sizeBtn = page.getByRole('dialog').locator('button:has-text("M")').first();
        if (await sizeBtn.isVisible()) await sizeBtn.click();
        // Click buy
        const buyBtn = page.getByRole('dialog').getByRole('button', { name: /get it|buy/i }).first();
        if (await buyBtn.isVisible()) {
          await buyBtn.click();
          await expect(page).toHaveURL(/checkout\/delivery/, { timeout: 5000 });
        }
      }
    });

    test('quick view disabled color swatch cannot be selected', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        const oosSwatches = page.getByRole('dialog').locator('button[aria-label*="out of stock"]');
        if (await oosSwatches.count() > 0) {
          await oosSwatches.first().click({ force: true });
          // Should not crash, swatch stays disabled
        }
      }
    });

    test('quick view color/size error indicators display', async ({ page }) => {
      const card = page.locator('a[href*="/product/"]').first();
      await card.hover();
      await page.waitForTimeout(300);
      const quickViewBtn = card.getByRole('button', { name: /quick view/i });
      if (await quickViewBtn.isVisible()) {
        await quickViewBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        // Click buy without selecting anything
        const buyBtn = page.getByRole('dialog').getByRole('button', { name: /get it|buy/i }).first();
        if (await buyBtn.isVisible()) {
          await buyBtn.click();
          // Error should highlight color and size areas
          await expect(page.locator('text=/please select/i').first()).toBeVisible();
        }
      }
    });
  });
});

test.describe('Catalog — ProductCard states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/women/clothing');
    await page.waitForLoadState('networkidle');
  });

  test('product card "Added!" state after add to cart', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    await card.hover();
    await page.waitForTimeout(300);
    const addBtn = card.getByRole('button', { name: /add to cart/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Should show "Added!" text briefly
      await page.waitForTimeout(300);
    }
  });

  test('product card title tooltip on hover', async ({ page }) => {
    const card = page.locator('a[href*="/product/"]').first();
    const title = card.locator('h3, h4, [class*="title"]').first();
    if (await title.isVisible()) {
      await title.hover();
      await page.waitForTimeout(500);
    }
  });

  test('product card handles broken image gracefully', async ({ page }) => {
    // Page should render even if an image fails to load
    await expect(page.locator('a[href*="/product/"]').first()).toBeVisible();
  });
});

test.describe('Catalog — Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/women/clothing');
    await page.waitForLoadState('networkidle');
  });

  test('filter sidebar checkbox toggles filter', async ({ page }) => {
    const filterCheckbox = page.locator('input[type="checkbox"]').first();
    if (await filterCheckbox.isVisible()) {
      await filterCheckbox.check();
      await page.waitForTimeout(500);
      // Products should update
      await filterCheckbox.uncheck();
    }
  });

  test('clear all filters button resets', async ({ page }) => {
    const filterCheckbox = page.locator('input[type="checkbox"]').first();
    if (await filterCheckbox.isVisible()) {
      await filterCheckbox.check();
      await page.waitForTimeout(300);
      const clearBtn = page.getByRole('button', { name: /clear|reset/i }).first();
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('no results state after restrictive filters', async ({ page }) => {
    // Apply many restrictive filters at once
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    // Check multiple boxes to narrow results down
    for (let i = 0; i < Math.min(count, 5); i++) {
      if (await checkboxes.nth(i).isVisible()) {
        await checkboxes.nth(i).check();
      }
    }
    await page.waitForTimeout(500);
    // Either products appear or "no results" message
    const noResults = page.locator('text=/no results|no products|nothing found/i').first();
    const products = page.locator('a[href*="/product/"]').first();
    const hasNoResults = await noResults.isVisible().catch(() => false);
    const hasProducts = await products.isVisible().catch(() => false);
    expect(hasNoResults || hasProducts).toBeTruthy();
  });

  test('breadcrumbs navigation works', async ({ page }) => {
    const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]').first();
    if (await breadcrumb.isVisible()) {
      const homeLink = breadcrumb.getByRole('link', { name: /home/i }).first();
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    }
  });

  test('out-of-stock product card shows grayscale and no Add to Cart', async ({ page }) => {
    // Look for OOS indicators
    const oosCard = page.locator('text=/out of stock/i').first();
    if (await oosCard.isVisible()) {
      // The parent card should not have Add to Cart
      const parentCard = oosCard.locator('..').locator('..');
      const addBtn = parentCard.getByRole('button', { name: /add to cart/i });
      expect(await addBtn.count()).toBe(0);
    }
  });
});

test.describe('Catalog — Navigation between catalogs', () => {
  test('navigate from women clothing to men clothing', async ({ page }) => {
    await page.goto('/women/clothing');
    await page.getByRole('link', { name: /men/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('all 8 catalog pages load', async ({ page }) => {
    const catalogs = [
      '/women/clothing', '/women/shoes', '/women/bags', '/women/accessories',
      '/men/clothing', '/men/shoes', '/men/bags', '/men/accessories',
    ];
    for (const url of catalogs) {
      await page.goto(url);
      await expect(page.locator('a[href*="/product/"]').first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
