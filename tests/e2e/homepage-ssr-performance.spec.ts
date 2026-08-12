import { expect, test } from '@playwright/test';

/**
 * Guards the homepage's server-rendered critical path.
 *
 * The regression these specs exist for: `<Header>` called `useSearchParams()`
 * without a Suspense boundary of its own, so Next resolved the missing
 * boundary by bailing the nearest one — the route's `loading.tsx` — out to
 * client-side rendering. The document that reached the browser was therefore
 * pure skeleton: no `<img>` anywhere, so the preload scanner never saw the LCP
 * hero and the image was only requested after hydration. Lighthouse measured
 * LCP 7.5 s / FCP 1.3 s against that build.
 *
 * All four assertions below fail on that version and pass on the fixed one.
 */
test.describe('Homepage critical path', () => {
  test('hero image is in the server HTML, before any script runs', async ({ request, baseURL }) => {
    // Raw fetch, not `page.goto`: the point is what the *document* contains,
    // and a hydrated page would hide the difference completely.
    const html = await (await request.get(baseURL ?? '/')).text();

    expect(html).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING</template><div class="min-h-screen');
    expect(html).toMatch(/<img[^>]*data-testid="hero-slide-image"/);

    const head = html.split('</head>')[0];
    // `priority` on the LCP image only pays off if the hint reaches the head —
    // that is what lets the connection open while the body is still parsing.
    expect(head).toMatch(/<link rel="preload" as="image"[^>]*fetchPriority="high"/);
    expect(head).toContain('rel="preconnect"');
  });

  test('only the visible hero slide loads its photo up front', async ({ page }) => {
    const heroRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'image' && /\/block\/\d+\/image\//.test(req.url())) heroRequests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('hero-slide-image')).toBeAttached();

    // The other slides are full-bleed photos of the same weight sitting in the
    // viewport at opacity 0, so `loading="lazy"` does not hold them back — the
    // component withholds their `<img>` until the main thread is idle.
    const heroImages = page.locator('[role="region"] img[data-nimg="fill"]');
    expect(await heroImages.count()).toBe(1);

    // …and they do arrive, once idle: the crossfade needs them decoded.
    await page.waitForTimeout(2500);
    expect(await heroImages.count()).toBeGreaterThan(1);
  });

  test('declared icons resolve to real files, not the 404 page', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('link[rel~="icon"], link[rel="shortcut icon"]')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLLinkElement).getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} status`).toBe(200);
      // A missing file under `public/` still answers 200 — with the not-found
      // *page*, ~145 KB of HTML the browser downloads as a favicon.
      expect(res.headers()['content-type'], `${href} content-type`).not.toContain('text/html');
    }
  });
});
