import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── SDK mock ──────────────────────────────────────────────────────────────────
const getFormsDataByMarker = vi.fn();
// `isModerate` is only delivered through the products API, so the moderation
// probe reads it off a product — hence `Products` on the fake api.
const getProducts = vi.fn();
const fakeApi = { FormData: { getFormsDataByMarker }, Products: { getProducts } };

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApiSafe: () => fakeApi,
  getApi: () => fakeApi,
  isOneEntryEnabled: true,
  isError: (v: unknown) => !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// unstable_cache is transparent in tests — call the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

// loadProductById is pulled in by loadProductReviews; stub it so there is no
// actual SDK call and we can control what it resolves with.
const loadProductById = vi.fn();
vi.mock('@/lib/oneentry/catalog/products', () => ({ loadProductById }));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/catalog/reviews');
};

beforeEach(() => {
  getFormsDataByMarker.mockReset();
  loadProductById.mockReset();
  getProducts.mockReset();
  // Default: no configs to read, so nothing is treated as premoderated.
  getProducts.mockResolvedValue({ items: [] });
});

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** A fake product with one size so pickSize has something to cycle through. */
const fakeProduct = { id: '1', name: 'Test Product', sizes: ['M', 'L'], colors: [] };

/**
 * Build a flat `formData: RawFormDataField[]` feedback item — the shape OE
 * currently returns and the shape the fix was designed to handle.
 */
function makeFlatFeedback(
  id: number,
  opts: { body?: string; headline?: string; name?: string; time?: string; user?: string } = {},
) {
  return {
    id,
    time: opts.time ?? '2024-06-01T10:00:00.000Z',
    userIdentifier: opts.user ?? `user-${id}`,
    formData: [
      {
        marker: 'body',
        type: 'text',
        // `body` is extracted via textValue(), which expects [{ plainValue }].
        value: [{ plainValue: opts.body ?? 'Great product!' }],
      },
      {
        marker: 'headline',
        type: 'string',
        // `headline` is extracted via String(value(...)), not textValue() — store as a plain string.
        value: opts.headline ?? 'Loved it',
      },
      {
        marker: 'name',
        type: 'string',
        value: opts.name ?? 'Alice',
      },
    ],
  };
}

/**
 * Build a flat feedback item whose body is empty — these must be filtered out
 * by `withBody`.
 */
function makeEmptyBodyFeedback(id: number) {
  return {
    id,
    time: '2024-06-01T09:00:00.000Z',
    userIdentifier: `user-${id}`,
    formData: [
      {
        marker: 'body',
        type: 'text',
        value: [{ plainValue: '' }],
      },
      { marker: 'headline', type: 'string', value: 'No body here' },
      { marker: 'name', type: 'string', value: 'Bob' },
    ],
  };
}

/** Build a flat rating item. */
function makeFlatRating(id: number, rating: number, user: string, time?: string) {
  return {
    id,
    time: time ?? '2024-06-01T09:59:00.000Z',
    userIdentifier: user,
    formData: [{ marker: 'rating', type: 'integer', value: rating }],
  };
}

/**
 * Build the same feedback in the *wrapped* `{ en_US: [...] }` shape that
 * older OE versions returned — the fix must still parse this correctly.
 */
function makeWrappedFeedback(
  id: number,
  opts: { body?: string; headline?: string; name?: string; time?: string; user?: string } = {},
) {
  return {
    id,
    time: opts.time ?? '2024-06-01T10:00:00.000Z',
    userIdentifier: opts.user ?? `user-${id}`,
    formData: {
      en_US: [
        {
          marker: 'body',
          type: 'text',
          value: [{ plainValue: opts.body ?? 'Great product!' }],
        },
        {
          marker: 'headline',
          type: 'string',
          value: opts.headline ?? 'Loved it',
        },
        {
          marker: 'name',
          type: 'string',
          value: opts.name ?? 'Alice',
        },
      ],
    },
  };
}

/** Build a wrapped rating item. */
function makeWrappedRating(id: number, rating: number, user: string, time?: string) {
  return {
    id,
    time: time ?? '2024-06-01T09:59:00.000Z',
    userIdentifier: user,
    formData: { en_US: [{ marker: 'rating', type: 'integer', value: rating }] },
  };
}

// ── timeout ceiling ───────────────────────────────────────────────────────────
describe('loadProductReviews — 2 s timeout ceiling', () => {
  it('returns [] when form-data fetch never resolves within 2 s', async () => {
    vi.useFakeTimers();

    // A promise that intentionally never settles — simulates a hung OE endpoint.
    getFormsDataByMarker.mockReturnValue(
      new Promise(() => {
        /* never */
      }),
    );
    loadProductById.mockReturnValue(
      new Promise(() => {
        /* never */
      }),
    );

    const { loadProductReviews } = await importFresh();
    const reviewsP = loadProductReviews(7730);

    // Advance fake clock past the 2 s ceiling; the async variant flushes
    // queued microtasks so Promise.race settles correctly.
    await vi.advanceTimersByTimeAsync(2001);

    const reviews = await reviewsP;
    expect(reviews).toEqual([]);

    vi.useRealTimers();
  });
});

// ── premoderation ─────────────────────────────────────────────────────────────
describe('loadProductReviews — premoderation', () => {
  /*
    The flag is read per module-config, not once for the feature: on the live
    project the feedback config is premoderated and the rating config is not.
    A single shared rule would either publish unmoderated feedback or hide every
    rating, so both directions are pinned here.
  */
  it('hides unapproved feedback when its config is premoderated', async () => {
    // Config ids fall back to 13 (feedback) / 12 (rating): the fake api has no
    // `Forms`, so the resolver cannot read them from the form.
    getProducts.mockResolvedValue({
      items: [
        {
          id: 1,
          moduleFormConfigs: [
            { id: 13, isModerate: true },
            { id: 12, isModerate: false },
          ],
        },
      ],
    });
    getFormsDataByMarker
      .mockResolvedValueOnce({
        items: [
          { ...makeFlatFeedback(1, { user: 'user-1' }), status: 'sent' },
          { ...makeFlatFeedback(2, { user: 'user-2' }), status: 'approved' },
        ],
      })
      .mockResolvedValueOnce({ items: [] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.id).toBe(2);
  });

  it('keeps records of an unmoderated config, which never reach "approved"', async () => {
    getProducts.mockResolvedValue({
      items: [{ id: 1, moduleFormConfigs: [{ id: 13, isModerate: false }] }],
    });
    getFormsDataByMarker
      .mockResolvedValueOnce({
        items: [{ ...makeFlatFeedback(1, { user: 'user-1' }), status: 'sent' }],
      })
      .mockResolvedValueOnce({ items: [] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toHaveLength(1);
  });
});

// ── flat formData shape (current OE response) ─────────────────────────────────
describe('loadProductReviews — flat formData shape', () => {
  it('returns a populated ProductReview[] with correct body, rating, date, and id', async () => {
    const user = 'user-1';
    const fbTime = '2024-06-01T10:00:00.000Z';
    const ratingTime = '2024-06-01T09:59:00.000Z';

    // First call → feedback list; second call → rating list.
    getFormsDataByMarker
      .mockResolvedValueOnce({ items: [makeFlatFeedback(42, { user, time: fbTime })] })
      .mockResolvedValueOnce({ items: [makeFlatRating(99, 4, user, ratingTime)] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toHaveLength(1);
    const r = reviews[0];
    expect(r.id).toBe(42);
    expect(r.body).toBe('Great product!');
    expect(r.rating).toBe(4);
    // fmtDate('2024-06-01T10:00:00.000Z') → e.g. "01 Jun 2024"
    expect(r.date).toMatch(/Jun.*2024/);
    expect(r.title).toBe('Loved it');
    // size cycles: 42 % 2 === 0 → sizes[0] === 'M'
    expect(r.size).toBe('M');
    expect(r.verified).toBe(true);
    expect(r.helpful).toBe(0);
  });

  it('filters out feedback records with an empty body', async () => {
    const user = 'user-2';
    getFormsDataByMarker
      .mockResolvedValueOnce({
        items: [makeEmptyBodyFeedback(10), makeFlatFeedback(11, { user, body: 'Real review' })],
      })
      .mockResolvedValueOnce({ items: [makeFlatRating(20, 5, user)] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe(11);
    expect(reviews[0].body).toBe('Real review');
  });

  it('returns [] when every feedback record has an empty body', async () => {
    getFormsDataByMarker
      .mockResolvedValueOnce({ items: [makeEmptyBodyFeedback(1), makeEmptyBodyFeedback(2)] })
      .mockResolvedValueOnce({ items: [] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toEqual([]);
  });
});

// ── wrapped { en_US: [...] } shape (legacy OE response) ──────────────────────
describe('loadProductReviews — wrapped { en_US } formData shape', () => {
  it('returns the same ProductReview[] as the flat shape', async () => {
    const user = 'user-3';
    const fbTime = '2024-06-01T10:00:00.000Z';
    const ratingTime = '2024-06-01T09:59:00.000Z';

    getFormsDataByMarker
      .mockResolvedValueOnce({ items: [makeWrappedFeedback(55, { user, time: fbTime })] })
      .mockResolvedValueOnce({ items: [makeWrappedRating(60, 3, user, ratingTime)] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toHaveLength(1);
    const r = reviews[0];
    expect(r.id).toBe(55);
    expect(r.body).toBe('Great product!');
    expect(r.rating).toBe(3);
    expect(r.date).toMatch(/Jun.*2024/);
  });

  it('filters out wrapped feedback records with an empty body', async () => {
    const user = 'user-4';
    const emptyWrapped = {
      id: 70,
      time: '2024-06-01T09:00:00.000Z',
      userIdentifier: user,
      formData: {
        en_US: [
          { marker: 'body', type: 'text', value: [{ plainValue: '' }] },
          { marker: 'headline', type: 'string', value: 'Empty' },
          { marker: 'name', type: 'string', value: 'Carol' },
        ],
      },
    };
    getFormsDataByMarker.mockResolvedValueOnce({ items: [emptyWrapped] }).mockResolvedValueOnce({ items: [] });
    loadProductById.mockResolvedValue(fakeProduct);

    const { loadProductReviews } = await importFresh();
    const reviews = await loadProductReviews(1);

    expect(reviews).toEqual([]);
  });
});
