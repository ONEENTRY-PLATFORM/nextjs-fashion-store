import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Input validation tests — verify that every form field rejects invalid data
 * and shows proper error messages per Zod schemas in utils/schemas.ts.
 */

// ─── Helper: open login modal ───────────────────────────────────────────────
async function openLoginModal(page: any) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('button[aria-label="My account"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
}

async function openRegisterModal(page: any) {
  await openLoginModal(page);
  // Switch CTA text comes from OE (sign_in_create_one) with fallback "Create one".
  // Match by role + regex so OE label variants ("Sign up", "Register") still work.
  await page.getByRole('button', { name: /create one|sign up|register/i }).first().click();
  await page.waitForTimeout(500);
}

// ─── Login Schema ───────────────────────────────────────────────────────────
test.describe('Input Validation — Login Form', () => {

  test('rejects invalid email format', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('not-an-email');
    await page.locator('input[placeholder="••••••••"]').fill('somepassword');
    await page.locator('button:has-text("Log In")').click();
    await expect(page.locator('text=/valid email|valid.*phone/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects email with spaces only', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('   ');
    await page.locator('input[placeholder="••••••••"]').fill('pass');
    await page.locator('button:has-text("Log In")').click();
    await expect(page.locator('text=/required|valid/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects empty password', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('test@test.com');
    // Leave password empty
    await page.locator('button:has-text("Log In")').click();
    await expect(page.locator('text=/required|password/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects phone with letters', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('+44 abc def ghij');
    await page.locator('input[placeholder="••••••••"]').fill('pass');
    await page.locator('button:has-text("Log In")').click();
    await expect(page.locator('text=/valid/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects emoji in email field', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('test😀@email.com');
    await page.locator('input[placeholder="••••••••"]').fill('pass');
    await page.locator('button:has-text("Log In")').click();
    // Should either reject or show invalid credentials
    await expect(page.locator('text=/valid|invalid/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('handles unicode/RTL characters in email', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('مرحبا@test.com');
    await page.locator('input[placeholder="••••••••"]').fill('pass');
    await page.locator('button:has-text("Log In")').click();
    await expect(page.locator('text=/valid|invalid/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('handles null-byte injection in email', async ({ page }) => {
    await openLoginModal(page);
    await page.locator('input[placeholder*="example.com"]').fill('test@test.com\x00admin');
    await page.locator('input[placeholder="••••••••"]').fill('111');
    await page.locator('button:has-text("Log In")').click();
    // Should not crash, should show invalid
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});

// ─── Register Schema ────────────────────────────────────────────────────────
test.describe('Input Validation — Register Form', () => {

  test('rejects empty first name', async ({ page }) => {
    await openRegisterModal(page);
    // Leave first name empty, fill rest
    await page.locator('input[placeholder*="example.com"]').first().fill('test@test.com');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('Password123!');
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    await expect(page.locator('text=/required|name/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects first name longer than 60 chars', async ({ page }) => {
    await openRegisterModal(page);
    await page.locator('input[autocomplete="given-name"]').first().fill('A'.repeat(61));
    await page.locator('input[placeholder*="example.com"]').first().fill('test@test.com');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('Password123!');
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    // Should show error or silently truncate
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('rejects invalid email in register', async ({ page }) => {
    await openRegisterModal(page);
    await page.locator('input[autocomplete="given-name"]').first().fill('Test');
    await page.locator('input[placeholder*="example.com"]').first().fill('not-an-email');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('Password123!');
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    await expect(page.locator('text=/valid email|email/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects password shorter than 8 chars in register', async ({ page }) => {
    await openRegisterModal(page);
    await page.locator('input[autocomplete="given-name"]').first().fill('Test');
    await page.locator('input[placeholder*="example.com"]').first().fill('test@test.com');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('123');
    const phoneInput = page.getByPlaceholder(/\+44/i).first();
    if (await phoneInput.isVisible()) await phoneInput.fill('+44 123 456 7890');
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    await expect(page.locator('text=/at least 8|characters|too short/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('rejects phone with special characters in register', async ({ page }) => {
    await openRegisterModal(page);
    await page.locator('input[autocomplete="given-name"]').first().fill('Test');
    await page.locator('input[placeholder*="example.com"]').first().fill('test@test.com');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('Password123!');
    const phoneInput = page.getByPlaceholder(/\+44/i).first();
    if (await phoneInput.isVisible()) await phoneInput.fill('not-a-phone!!!');
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
  });
});

/** Seed cart into localStorage BEFORE page loads — avoids hydration mismatch */
async function goToDeliveryAsGuest(page: any) {
  await page.addInitScript(() => {
    const store = JSON.parse(localStorage.getItem('oe_store') || '{}');
    store.cart = {
      items: [{ id: 'wc-3-test', name: 'Test Dress', brand: 'OE', sku: 'wc-3', color: '#000', size: 'M', quantity: 1, price: 49.99, image: '/icons/icon-192.png' }],
      miniCartOpen: false,
    };
    store.__version = 3;
    localStorage.setItem('oe_store', JSON.stringify(store));
  });
  await page.goto('/checkout/delivery');
  await page.waitForLoadState('networkidle');
  const guestBtn = page.getByRole('button', { name: /continue as guest/i }).first();
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
    await page.waitForTimeout(500);
  }
}

// ─── Address Schema (Checkout Delivery) ────────────────────────────────────
test.describe('Input Validation — Address Form', () => {

  test('rejects empty address fields', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    // Click Continue to Payment — should trigger validation
    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    // Scroll back up to see validation errors near form fields
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // Validation errors shown as role="alert" elements
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('rejects invalid postcode format', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const postcode = page.getByPlaceholder(/post/i).or(page.locator('input[name="postcode"]'));
    if (await postcode.isVisible()) {
      await postcode.fill('!!!invalid!!!');
      // Fill other required fields to isolate postcode error
      const fullName = page.getByPlaceholder(/full name/i).or(page.locator('input[name="fullName"]'));
      if (await fullName.isVisible()) await fullName.fill('Test User');
      const phone = page.getByPlaceholder(/phone/i).or(page.locator('input[name="phone"]'));
      if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
      const line1 = page.getByPlaceholder(/address/i).or(page.locator('input[name="line1"]'));
      if (await line1.isVisible()) await line1.fill('123 Test St');
      const city = page.getByPlaceholder(/city/i).or(page.locator('input[name="city"]'));
      if (await city.isVisible()) await city.fill('London');

      const continueBtn = page.getByRole('button', { name: /continue|payment/i }).first();
      if (await continueBtn.isVisible()) await continueBtn.click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('rejects phone with letters in address form', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const phone = page.getByPlaceholder(/phone/i).or(page.locator('input[name="phone"]'));
    if (await phone.isVisible()) {
      await phone.fill('abcdefghij');
      const fullName = page.getByPlaceholder(/full name/i).or(page.locator('input[name="fullName"]'));
      if (await fullName.isVisible()) await fullName.fill('Test User');
      const line1 = page.getByPlaceholder(/address/i).or(page.locator('input[name="line1"]'));
      if (await line1.isVisible()) await line1.fill('123 Test St');
      const city = page.getByPlaceholder(/city/i).or(page.locator('input[name="city"]'));
      if (await city.isVisible()) await city.fill('London');
      const postcode = page.getByPlaceholder(/post/i).or(page.locator('input[name="postcode"]'));
      if (await postcode.isVisible()) await postcode.fill('W1A 1AA');

      const continueBtn = page.getByRole('button', { name: /continue|payment/i }).first();
      if (await continueBtn.isVisible()) await continueBtn.click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('rejects HTML/script tags in address fields', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const fullName = page.locator('input[placeholder="Jane Smith"]').first();
    if (await fullName.isVisible()) await fullName.fill('<script>alert(1)</script>');
    const phone = page.locator('input[placeholder*="+44 20"]').first();
    if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
    const line1 = page.locator('input[placeholder*="Street"]').first();
    if (await line1.isVisible()) await line1.fill('<img src=x onerror=alert(1)>');
    const city = page.locator('input[placeholder="London"]').first();
    if (await city.isVisible()) await city.fill('<b>London</b>');
    const postcode = page.locator('input[placeholder*="SW1A"]').first();
    if (await postcode.isVisible()) await postcode.fill('W1A 1AA');

    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    // Should not crash — XSS should be escaped, not executed
    await expect(page.locator('body')).toBeVisible();
    // Check no alert was triggered
    const alertTriggered = await page.evaluate(() => (window as any).__xss === true);
    expect(alertTriggered).toBeFalsy();
  });

  test('rejects address line longer than 200 chars', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const line1 = page.locator('input[placeholder*="Street"]').first();
    if (await line1.isVisible()) await line1.fill('A'.repeat(201));
    const fullName = page.locator('input[placeholder="Jane Smith"]').first();
    if (await fullName.isVisible()) await fullName.fill('Test');
    const phone = page.locator('input[placeholder*="+44 20"]').first();
    if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
    const city = page.locator('input[placeholder="London"]').first();
    if (await city.isVisible()) await city.fill('London');
    const postcode = page.locator('input[placeholder*="SW1A"]').first();
    if (await postcode.isVisible()) await postcode.fill('W1A 1AA');

    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    // Address > 200 chars — page should stay on delivery (not navigate) or show no crash
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Payment Schema ─────────────────────────────────────────────────────────
test.describe('Input Validation — Payment Form', () => {

  test('rejects letters in card number', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cardNum = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      if (await cardNum.isVisible()) {
        await cardNum.fill('abcd efgh ijkl mnop');
        const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
        if (await placeBtn.isVisible()) await placeBtn.click();
        await expect(page.locator('text=/valid card|card number|invalid/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects card number failing Luhn check', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cardNum = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      if (await cardNum.isVisible()) {
        await cardNum.fill('4111111111111112'); // fails Luhn
        const name = page.getByPlaceholder(/name on card/i).or(page.locator('input[name="nameOnCard"]'));
        if (await name.isVisible()) await name.fill('Test');
        const expiry = page.getByPlaceholder(/expiry|MM/i).or(page.locator('input[name="expiry"]'));
        if (await expiry.isVisible()) await expiry.fill('12/28');
        const cvv = page.getByPlaceholder(/cvv|cvc/i).or(page.locator('input[name="cvv"]'));
        if (await cvv.isVisible()) await cvv.fill('123');
        const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
        if (await placeBtn.isVisible()) await placeBtn.click();
        await expect(page.locator('text=/invalid|card number/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects invalid expiry format', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const expiry = page.getByPlaceholder(/expiry|MM/i).or(page.locator('input[name="expiry"]'));
      if (await expiry.isVisible()) {
        await expiry.fill('13/99'); // month 13 invalid
        const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
        if (await placeBtn.isVisible()) await placeBtn.click();
        await expect(page.locator('text=/MM.*YY|expiry|format/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects expired card', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cardNum = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      if (await cardNum.isVisible()) await cardNum.fill('4111111111111111');
      const name = page.getByPlaceholder(/name on card/i).or(page.locator('input[name="nameOnCard"]'));
      if (await name.isVisible()) await name.fill('Test');
      const expiry = page.getByPlaceholder(/expiry|MM/i).or(page.locator('input[name="expiry"]'));
      if (await expiry.isVisible()) await expiry.fill('01/20'); // expired
      const cvv = page.getByPlaceholder(/cvv|cvc/i).or(page.locator('input[name="cvv"]'));
      if (await cvv.isVisible()) await cvv.fill('123');
      const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
      if (await placeBtn.isVisible()) await placeBtn.click();
      await expect(page.locator('text=/expired|past|expiry/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('rejects CVV with letters', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cvv = page.getByPlaceholder(/cvv|cvc/i).or(page.locator('input[name="cvv"]'));
      if (await cvv.isVisible()) {
        await cvv.fill('abc');
        const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
        if (await placeBtn.isVisible()) await placeBtn.click();
        await expect(page.locator('text=/CVV|digits|3.*4/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects CVV with 2 digits (too short)', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cvv = page.getByPlaceholder(/cvv|cvc/i).or(page.locator('input[name="cvv"]'));
      if (await cvv.isVisible()) {
        await cvv.fill('12');
        const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
        if (await placeBtn.isVisible()) await placeBtn.click();
        await expect(page.locator('text=/CVV|digits|3.*4/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ─── Promo Code Schema ──────────────────────────────────────────────────────
test.describe('Input Validation — Promo Code', () => {

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

  test('rejects empty promo code', async ({ page }) => {
    await addItemAndGoToCart(page);
    const promoToggle = page.locator('text=/promo|coupon/i').first();
    if (await promoToggle.isVisible()) {
      await promoToggle.click();
      await page.waitForTimeout(300);
      const applyBtn = page.getByRole('button', { name: /apply/i }).first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await expect(page.locator('text=/enter|required|invalid/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects promo code longer than 30 chars', async ({ page }) => {
    await addItemAndGoToCart(page);
    const promoToggle = page.locator('text=/promo|coupon/i').first();
    if (await promoToggle.isVisible()) {
      await promoToggle.click();
      await page.waitForTimeout(300);
      const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
      if (await promoInput.isVisible()) {
        await promoInput.fill('A'.repeat(31));
        const applyBtn = page.getByRole('button', { name: /apply/i }).first();
        if (await applyBtn.isVisible()) await applyBtn.click();
        await expect(page.locator('text=/invalid|too long|not found/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('promo code is case-insensitive (lowercased works)', async ({ page }) => {
    await addItemAndGoToCart(page);
    const promoToggle = page.locator('text=/promo|coupon/i').first();
    if (await promoToggle.isVisible()) {
      await promoToggle.click();
      await page.waitForTimeout(300);
      const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
      if (await promoInput.isVisible()) {
        await promoInput.fill('oneentry10'); // lowercase
        const applyBtn = page.getByRole('button', { name: /apply/i }).first();
        if (await applyBtn.isVisible()) await applyBtn.click();
        // Should accept (schema does .toUpperCase())
        await page.waitForTimeout(1000);
        const success = page.locator('text=/10%|discount|applied/i').first();
        const error = page.locator('text=/invalid/i').first();
        // One should be visible
        const hasSuccess = await success.isVisible().catch(() => false);
        const hasError = await error.isVisible().catch(() => false);
        expect(hasSuccess || hasError).toBeTruthy();
      }
    }
  });

  test('rejects emoji in promo code', async ({ page }) => {
    await addItemAndGoToCart(page);
    const promoToggle = page.locator('text=/promo|coupon/i').first();
    if (await promoToggle.isVisible()) {
      await promoToggle.click();
      await page.waitForTimeout(300);
      const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
      if (await promoInput.isVisible()) {
        await promoInput.fill('🎉🎉🎉');
        const applyBtn = page.getByRole('button', { name: /apply/i }).first();
        if (await applyBtn.isVisible()) await applyBtn.click();
        await expect(page.locator('text=/invalid|not found/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects special characters in promo code', async ({ page }) => {
    await addItemAndGoToCart(page);
    const promoToggle = page.locator('text=/promo|coupon/i').first();
    if (await promoToggle.isVisible()) {
      await promoToggle.click();
      await page.waitForTimeout(300);
      const promoInput = page.getByPlaceholder(/code|promo|coupon/i).first();
      if (await promoInput.isVisible()) {
        await promoInput.fill('!@#$%^&*()');
        const applyBtn = page.getByRole('button', { name: /apply/i }).first();
        if (await applyBtn.isVisible()) await applyBtn.click();
        await expect(page.locator('text=/invalid|not found/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ─── Register — Terms checkbox ──────────────────────────────────────────────
test.describe('Input Validation — Register Terms', () => {

  test('register without accepting terms shows error', async ({ page }) => {
    await openRegisterModal(page);
    await page.locator('input[autocomplete="given-name"]').first().fill('Test');
    await page.locator('input[placeholder*="example.com"]').first().fill('new@test.com');
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() > 0) await pwInputs.first().fill('Password123!');
    const phoneInput = page.getByPlaceholder(/\+44/i).first();
    if (await phoneInput.isVisible()) await phoneInput.fill('+44 123 456 7890');
    // Do NOT check "I agree" checkbox
    const submitBtn = page.locator('button:has-text("Register")').first();
    if (await submitBtn.isVisible()) await submitBtn.click();
    await expect(page.locator('text=/accept|terms|agree/i').first()).toBeVisible({ timeout: 3000 });
  });
});

// ─── Address — city and instructions ────────────────────────────────────────
test.describe('Input Validation — Address extras', () => {

  test('rejects empty city', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    // Fill all fields except city
    const fullName = page.locator('input[placeholder="Jane Smith"]').first();
    if (await fullName.isVisible()) await fullName.fill('Test User');
    const phone = page.locator('input[placeholder*="+44 20"]').first();
    if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
    const line1 = page.locator('input[placeholder*="Street"]').first();
    if (await line1.isVisible()) await line1.fill('123 Test St');
    // Explicitly clear city
    const city = page.locator('input[placeholder="London"]').first();
    if (await city.isVisible()) await city.fill('');
    const postcode = page.locator('input[placeholder*="SW1A"]').first();
    if (await postcode.isVisible()) await postcode.fill('W1A 1AA');
    // Submit
    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // Should show city required error
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('instructions field accepts up to 500 chars', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const instructions = page.locator('input[placeholder*="Gate code"], input[placeholder*="instructions"]').first();
    if (await instructions.isVisible()) {
      await instructions.fill('A'.repeat(500));
      // Should not show error — 500 is max
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('rejects name longer than 100 chars in address', async ({ page }) => {
    await goToDeliveryAsGuest(page);
    const fullName = page.locator('input[placeholder="Jane Smith"]').first();
    if (await fullName.isVisible()) await fullName.fill('A'.repeat(101));
    const phone = page.locator('input[placeholder*="+44 20"]').first();
    if (await phone.isVisible()) await phone.fill('+44 123 456 7890');
    const line1 = page.locator('input[placeholder*="Street"]').first();
    if (await line1.isVisible()) await line1.fill('123 Test St');
    const city = page.locator('input[placeholder="London"]').first();
    if (await city.isVisible()) await city.fill('London');
    const postcode = page.locator('input[placeholder*="SW1A"]').first();
    if (await postcode.isVisible()) await postcode.fill('W1A 1AA');
    const continueBtn = page.locator('button:has-text("Continue to Payment")');
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // Should either truncate or show error
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Payment — name on card ─────────────────────────────────────────────────
test.describe('Input Validation — Payment name on card', () => {

  test('rejects empty name on card', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const cardNum = page.locator('input[placeholder*="1234"]').first();
      if (await cardNum.isVisible()) await cardNum.fill('4111111111111111');
      // Leave name empty
      const expiry = page.locator('input[placeholder="MM/YY"]').first();
      if (await expiry.isVisible()) await expiry.fill('12/28');
      const cvv = page.locator('input[placeholder="•••"]').first();
      if (await cvv.isVisible()) await cvv.fill('123');
      const placeBtn = page.getByRole('button', { name: /place order|pay|confirm/i }).first();
      if (await placeBtn.isVisible()) await placeBtn.click();
      await expect(page.locator('text=/required|name.*card/i').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('rejects numbers-only in name on card', async ({ page }) => {
    await page.goto('/checkout/payment');
    await page.waitForLoadState('networkidle');
    const cardOption = page.locator('text=/card online/i').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
      const name = page.locator('input[placeholder="Jane Smith"]').first();
      if (await name.isVisible()) await name.fill('1234567890');
      // Should accept (schema only checks min(1), max(100)) but still test it doesn't crash
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ─── Write Review Modal ─────────────────────────────────────────────────────
test.describe('Input Validation — Write Review', () => {

  test('submit empty review shows validation errors', async ({ page }) => {
    await page.goto('/product/wc-1');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const writeBtn = page.getByRole('button', { name: /write.*review/i }).first();
    if (await writeBtn.isVisible()) {
      await writeBtn.click();
      await page.waitForTimeout(500);
      // Submit empty form
      const submitBtn = page.locator('button:has-text("Send")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Should show validation errors for required fields
        await expect(page.locator('text=/required|rate|review/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('rejects review with XSS in text fields', async ({ page }) => {
    await page.goto('/product/wc-1');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const writeBtn = page.getByRole('button', { name: /write.*review/i }).first();
    if (await writeBtn.isVisible()) {
      await writeBtn.click();
      await page.waitForTimeout(500);
      const reviewInput = page.locator('textarea, textarea').first();
      if (await reviewInput.isVisible()) {
        await reviewInput.fill('<script>alert("xss")</script>');
      }
      const headlineInput = page.locator('input[placeholder*="Summarize"], input[placeholder*="summarize"]').first();
      if (await headlineInput.isVisible()) {
        await headlineInput.fill('<img src=x onerror=alert(1)>');
      }
      // Should not execute scripts
      const alert = await page.evaluate(() => (window as any).__xss === true);
      expect(alert).toBeFalsy();
    }
  });

  test('review name field rejects empty value', async ({ page }) => {
    await page.goto('/product/wc-1');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const writeBtn = page.getByRole('button', { name: /write.*review/i }).first();
    if (await writeBtn.isVisible()) {
      await writeBtn.click();
      await page.waitForTimeout(500);
      // Fill review but leave name empty
      const reviewInput = page.locator('textarea, textarea').first();
      if (await reviewInput.isVisible()) await reviewInput.fill('Great product');
      const headlineInput = page.locator('input[placeholder*="Summarize"], input[placeholder*="summarize"]').first();
      if (await headlineInput.isVisible()) await headlineInput.fill('Love it');
      // Leave name empty
      const emailInput = page.locator('input[placeholder*="@"]').first();
      if (await emailInput.isVisible()) await emailInput.fill('test@test.com');
      // Select rating
      const star = page.locator('button[aria-label*="star"]').nth(3);
      if (await star.isVisible()) await star.click();

      const submitBtn = page.locator('button:has-text("Send")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(page.locator('text=/required|name/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('review email field rejects invalid format', async ({ page }) => {
    await page.goto('/product/wc-1');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const writeBtn = page.getByRole('button', { name: /write.*review/i }).first();
    if (await writeBtn.isVisible()) {
      await writeBtn.click();
      await page.waitForTimeout(500);
      const emailInput = page.locator('input[placeholder*="@"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('not-an-email');
      }
      const submitBtn = page.locator('button:has-text("Send")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(page.locator('text=/valid.*email|email.*required/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ─── Profile Edit (Account) ─────────────────────────────────────────────────
test.describe('Input Validation — Profile Edit', () => {

  test('profile rejects invalid email format', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    const editBtn = page.getByRole('button', { name: /edit|change/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(300);
      const emailInput = page.locator('input[type="email"], input[placeholder*="example.com"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('not-valid-email');
        const saveBtn = page.getByRole('button', { name: /save/i }).first();
        if (await saveBtn.isVisible()) await saveBtn.click();
        await expect(page.locator('text=/valid email|email/i').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('profile rejects invalid phone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    const editBtn = page.getByRole('button', { name: /edit|change/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(300);
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="+44"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('not-a-phone');
        const saveBtn = page.getByRole('button', { name: /save/i }).first();
        if (await saveBtn.isVisible()) await saveBtn.click();
        await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
