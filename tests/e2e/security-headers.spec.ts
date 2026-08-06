import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { assertPresent } from './helpers';

/**
 * Security headers must be strict enough to matter and loose enough not to
 * break the app — a CSP that silently blocks a font or an image is worse than
 * none, because nobody notices until a customer does. So every assertion here
 * pairs "the directive is present" with "the page still renders clean".
 */

/** Pages that between them exercise fonts, CDN images, the SDK and JSON-LD. */
const PAGES = ['/', '/sale', '/new', '/stores'];

/** Collect CSP violations reported through the console. */
function watchCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    if (/content security policy|refused to (load|connect|apply|execute)/i.test(text)) {
      violations.push(text);
    }
  });
  return violations;
}

test.describe('Security headers', () => {
  test('every hardening header is served', async ({ page }) => {
    const response = await page.goto('/');
    assertPresent(response, 'homepage response');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    // `poweredByHeader: false` — do not advertise the framework.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('CSP fences off the exfiltration channels that matter', async ({ page }) => {
    const response = await page.goto('/');
    assertPresent(response, 'homepage response');
    const csp = response.headers()['content-security-policy'];
    expect(csp, 'CSP header must be present').toBeTruthy();

    // The session lives in localStorage, so the directives that bound where a
    // stolen token could be sent are the load-bearing ones.
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    // An arbitrary third-party origin must not be reachable.
    expect(csp).not.toContain('connect-src *');
  });

  test('no page trips its own policy', async ({ page }) => {
    for (const path of PAGES) {
      const violations = watchCspViolations(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(violations, `CSP violations on ${path}`).toEqual([]);
      page.removeAllListeners('console');
    }
  });

  test('fonts, CDN images and the header still render under the policy', async ({ page }) => {
    const violations = watchCspViolations(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header').first()).toBeVisible();
    // At least one image must have actually decoded — a blocked `img-src`
    // shows up as naturalWidth 0 rather than as a missing element.
    const decoded = await page.evaluate(() =>
      [...document.querySelectorAll('img')].some((img) => img.naturalWidth > 0));
    expect(decoded, 'at least one image must load').toBe(true);
    expect(violations).toEqual([]);
  });
});

test.describe('JSON-LD escaping', () => {
  test('structured data stays parseable after escaping', async ({ page }) => {
    // `/sale` carries a BreadcrumbList block; the homepage's Organization /
    // WebSite blocks live in the same component, so one page proves the
    // serialiser for all of them.
    await page.goto('/sale');
    await page.waitForLoadState('networkidle');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, 'the page must ship at least one JSON-LD block').toBeGreaterThan(0);
    for (const raw of blocks) {
      // `<`, `>` and `&` are emitted as < / > / & so the HTML
      // parser can never see a `</script` sequence inside the payload.
      expect(raw).not.toContain('<');
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });
});
