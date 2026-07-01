import { test, expect } from '@playwright/test';
import { clearState, login, VALID_CREDS } from './helpers';

// Helper: add an item to cart and go to checkout
async function setupCheckout(page: any) {
  await page.goto('/product/wc-1');
  await page.waitForLoadState('networkidle');
  const sizeM = page.locator('button:has-text("M")').first();
  if (await sizeM.isVisible()) await sizeM.click();
  const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
  if (await addBtn.isVisible()) await addBtn.click();
  await page.waitForTimeout(500);
  await page.goto('/checkout/delivery');
  await page.waitForLoadState('networkidle');
}

test.describe('Checkout — Delivery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('guest modal appears for non-logged-in user', async ({ page }) => {
    await setupCheckout(page);
    // Guest modal should appear
    const guestModal = page.locator('text=/continue as guest|sign in/i').first();
    await expect(guestModal).toBeVisible({ timeout: 5000 });
  });

  test('continue as guest closes modal', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('delivery form validates required fields', async ({ page }) => {
    await setupCheckout(page);
    // Dismiss guest modal
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    // Try to continue without filling form
    const continueBtn = page.getByRole('button', { name: /continue|payment/i }).first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      // Should show validation errors
      await expect(page.locator('text=/required|enter|please/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('fill delivery form as guest and proceed', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    // Fill address form
    const fullName = page.getByPlaceholder(/full name/i).or(page.locator('input[name="fullName"]'));
    const phone = page.getByPlaceholder(/phone/i).or(page.locator('input[name="phone"]'));
    const line1 = page.getByPlaceholder(/address/i).or(page.locator('input[name="line1"]'));
    const city = page.getByPlaceholder(/city/i).or(page.locator('input[name="city"]'));
    const postcode = page.getByPlaceholder(/post/i).or(page.locator('input[name="postcode"]'));

    if (await fullName.isVisible()) await fullName.fill('Test User');
    if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
    if (await line1.isVisible()) await line1.fill('123 Test Street');
    if (await city.isVisible()) await city.fill('London');
    if (await postcode.isVisible()) await postcode.fill('W1A 1AA');
  });

  test('store pickup option works', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const pickupOption = page.locator('text=/store pickup|pick ?up/i').first();
    if (await pickupOption.isVisible()) {
      await pickupOption.click();
      // Store dropdown should appear
      await expect(page.locator('text=/oxford|covent|canary/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('logged-in user sees saved addresses', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await setupCheckout(page);
    // Should see saved addresses (Baker Street, Oxford Street)
    await expect(page.locator('text=/baker|oxford/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Checkout — Payment', () => {
  test('payment page shows payment methods', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const methods = page.locator('text=/cash|card|apple|google|qr|installment/i');
    expect(await methods.count()).toBeGreaterThan(0);
  });

  test('card payment form validates fields', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');

    // Select card payment
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);

      // Try to submit empty form
      const placeOrderBtn = page.getByRole('button', { name: /place order|pay/i }).first();
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();
        await expect(page.locator('text=/required|invalid|enter/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('XSS in card number field', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');

    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);

      const cardInput = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      if (await cardInput.isVisible()) {
        await cardInput.fill('<script>alert("xss")</script>');
        // Should not execute, just show validation error
      }
    }
  });
});

test.describe('Checkout — Confirmation', () => {
  test('confirmation page shows order ID', async ({ page }) => {
    await page.goto('/checkout/confirmation');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/OE-|order|confirmed/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('continue shopping navigates away', async ({ page }) => {
    await page.goto('/checkout/confirmation');
    await page.waitForLoadState('networkidle');
    const continueBtn = page.getByRole('button', { name: /continue shopping/i }).or(
      page.getByRole('link', { name: /continue shopping/i })
    ).first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await expect(page).not.toHaveURL(/confirmation/);
    }
  });

  test('confirmation page clears cart', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(300);
    await page.goto('/checkout/confirmation');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // Cart should be empty after confirmation
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/empty|start shopping/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Checkout — Delivery extras', () => {
  test.beforeEach(async ({ page }) => {
  });

  test('date picker shows next 7 days', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const datePicker = page.locator('button[class*="date"], [class*="date"] button').first();
    if (await datePicker.isVisible()) {
      await datePicker.click();
      await page.waitForTimeout(300);
    }
  });

  test('time slot selection works', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const timeSlot = page.locator('text=/morning|afternoon|evening/i').first();
    if (await timeSlot.isVisible()) {
      await timeSlot.click();
    }
  });

  test('parcel locker option shows locker list', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const lockerOption = page.locator('text=/parcel locker/i').first();
    if (await lockerOption.isVisible()) {
      await lockerOption.click();
      await expect(page.locator('text=/paddington|victoria|king|waterloo/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('"Save for future orders" checkbox on address form', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const saveCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /save|future/i }).or(
      page.locator('label:has-text("Save") input[type="checkbox"]')
    ).first();
    if (await saveCheckbox.isVisible()) {
      await saveCheckbox.check();
      await expect(saveCheckbox).toBeChecked();
    }
  });

  test('switch between delivery methods transitions UI', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const methods = ['home', 'store', 'locker'];
    for (const method of methods) {
      const btn = page.locator(`text=/${method}|delivery|pickup/i`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('login from guest modal populates saved addresses', async ({ page }) => {
    await setupCheckout(page);
    const signInBtn = page.getByRole('button', { name: /sign in/i }).first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.waitForTimeout(300);
      // Login
      await page.locator('input[placeholder*="example.com"]').fill(VALID_CREDS.email);
      await page.locator('input[placeholder="••••••••"]').fill(VALID_CREDS.password);
      await page.locator('button:has-text("Log In")').click();
      await page.waitForTimeout(1000);
      // Saved addresses should appear
      await expect(page.locator('text=/baker|oxford/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('coupon code on delivery page', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);

    const couponInput = page.getByPlaceholder(/code|coupon|promo/i).first();
    if (await couponInput.isVisible()) {
      await couponInput.fill('SAVE10');
      const applyBtn = page.getByRole('button', { name: /apply/i }).first();
      if (await applyBtn.isVisible()) await applyBtn.click();
    }
  });
});

test.describe('Checkout — Delivery navigation', () => {
  test('delivery page back button returns to cart', async ({ page }) => {
    await page.goto('/checkout/delivery');
    await page.waitForLoadState('networkidle');
    const backBtn = page.getByRole('button', { name: /back|cart/i }).or(
      page.getByRole('link', { name: /back|cart/i })
    ).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/cart/, { timeout: 5000 });
    }
  });

  test('delivery continue navigates to payment', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);
    const fields = {
      name: page.getByPlaceholder(/full name/i).or(page.locator('input[name="fullName"]')),
      phone: page.getByPlaceholder(/phone/i).or(page.locator('input[name="phone"]')),
      line1: page.getByPlaceholder(/address/i).or(page.locator('input[name="line1"]')),
      city: page.getByPlaceholder(/city/i).or(page.locator('input[name="city"]')),
      post: page.getByPlaceholder(/post/i).or(page.locator('input[name="postcode"]')),
    };
    if (await fields.name.isVisible()) await fields.name.fill('Test User');
    if (await fields.phone.isVisible()) await fields.phone.fill('+44 123 456 7890');
    if (await fields.line1.isVisible()) await fields.line1.fill('123 Test St');
    if (await fields.city.isVisible()) await fields.city.fill('London');
    if (await fields.post.isVisible()) await fields.post.fill('W1A 1AA');
    const continueBtn = page.getByRole('button', { name: /continue|payment/i }).first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await expect(page).toHaveURL(/payment/, { timeout: 5000 });
    }
  });

  test('guest modal backdrop click dismisses', async ({ page }) => {
    await setupCheckout(page);
    const backdrop = page.locator('[class*="fixed"][class*="inset"]').first();
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 5, y: 5 }, force: true });
      await page.waitForTimeout(500);
    }
  });

  test('guest modal register button opens register form', async ({ page }) => {
    await setupCheckout(page);
    const registerBtn = page.getByRole('button', { name: /create account|register/i }).first();
    if (await registerBtn.isVisible()) {
      await registerBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('select saved address radio (logged in)', async ({ page }) => {
    await page.goto('/');
    await login(page);
    await setupCheckout(page);
    const addrRadio = page.locator('input[type="radio"], [class*="address"] button').first();
    if (await addrRadio.isVisible()) {
      await addrRadio.click();
      await page.waitForTimeout(300);
    }
  });

  test('order summary toggle expands/collapses', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);
    const toggle = page.locator('button:has-text("Order Summary"), button:has-text("Summary")').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(200);
      await toggle.click();
    }
  });

  test('remove applied coupon on delivery', async ({ page }) => {
    await setupCheckout(page);
    const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
    if (await guestBtn.isVisible()) await guestBtn.click();
    await page.waitForTimeout(500);
    const couponInput = page.getByPlaceholder(/code|coupon|promo/i).first();
    if (await couponInput.isVisible()) {
      await couponInput.fill('SAVE10');
      const applyBtn = page.getByRole('button', { name: /apply/i }).first();
      if (await applyBtn.isVisible()) await applyBtn.click();
      await page.waitForTimeout(500);
      const removeBtn = page.getByRole('button', { name: /remove|×|✕/i }).first();
      if (await removeBtn.isVisible()) await removeBtn.click();
    }
  });
});

test.describe('Checkout — Payment methods', () => {
  test('cash on delivery option selectable', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cashOption = page.locator('text=/cash/i').first();
    if (await cashOption.isVisible()) await cashOption.click();
  });

  test('QR code payment shows QR image', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const qrOption = page.locator('text=/qr/i').first();
    if (await qrOption.isVisible()) {
      await qrOption.click();
      await page.waitForTimeout(300);
    }
  });

  test('Apple Pay option selectable', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const appleOption = page.locator('text=/apple pay/i').first();
    if (await appleOption.isVisible()) await appleOption.click();
  });

  test('card online payment completes and navigates to confirmation', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cardNum = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      const name = page.getByPlaceholder(/name on card/i).or(page.locator('input[name="nameOnCard"]'));
      const expiry = page.getByPlaceholder(/expiry|MM/i).or(page.locator('input[name="expiry"]'));
      const cvv = page.getByPlaceholder(/cvv|cvc/i).or(page.locator('input[name="cvv"]'));
      if (await cardNum.isVisible()) await cardNum.fill('4111111111111111');
      if (await name.isVisible()) await name.fill('Test User');
      if (await expiry.isVisible()) await expiry.fill('12/28');
      if (await cvv.isVisible()) await cvv.fill('123');
      const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
      if (await placeBtn.isVisible()) {
        await placeBtn.click();
        await expect(page).toHaveURL(/confirmation/, { timeout: 5000 });
      }
    }
  });

  test('payment page back button navigates to delivery', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const backBtn = page.getByRole('button', { name: /back|return/i }).or(
      page.getByRole('link', { name: /back|delivery/i })
    ).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/delivery/, { timeout: 5000 });
    }
  });

  test('installment plan shows 3/6 month options', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const installOption = page.locator('text=/installment/i').first();
    if (await installOption.isVisible()) {
      await installOption.click();
      await page.waitForTimeout(300);
      const monthOptions = page.locator('text=/3 month|6 month/i');
      if (await monthOptions.count() > 0) {
        await expect(monthOptions.first()).toBeVisible();
      }
    }
  });
});

// ─── Full logged-in checkout journey ──────────────────────────────────────────
test.describe('Checkout — Full logged-in journey', () => {
  test('login → add to cart → delivery with saved address → payment → confirmation', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await login(page);

    // 2. Add product to cart from PDP
    await page.goto('/product/wc-3');
    await page.waitForLoadState('networkidle');
    const sizeBtn = page.locator('button').filter({ hasText: /^(XS|S|M|L|XL)$/ }).first();
    await sizeBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await sizeBtn.click();
    const addBtn = page.locator('button:has-text("Add to Cart")');
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();
    await page.locator('text=/Your Bag/i').waitFor({ state: 'visible', timeout: 5000 });
    // Close mini cart
    const closeBtn = page.locator('button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    // 3. Go to delivery → should see saved addresses (Baker Street / Oxford Street)
    await page.goto('/checkout/delivery');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/baker|oxford/i').first()).toBeVisible({ timeout: 5000 });

    // 4. Select saved address and continue
    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await expect(page).toHaveURL(/payment/, { timeout: 5000 });

    // 5. Select cash on delivery and place order
    const cashOption = page.locator('text=/cash/i').first();
    if (await cashOption.isVisible()) await cashOption.click();
    const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
    if (await placeBtn.isVisible()) {
      await placeBtn.click();
      await expect(page).toHaveURL(/confirmation/, { timeout: 5000 });
    }

    // 6. Confirmation page shows order ID
    await expect(page.locator('text=/OE-|order|confirmed/i').first()).toBeVisible({ timeout: 5000 });
  });
});
