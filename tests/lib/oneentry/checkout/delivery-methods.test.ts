import { beforeEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is transparent in tests — invoke the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const getFormByMarker = vi.fn();

// `loadFormContent` reaches for `getApiSafe`; the loaders under test reach it
// through that helper rather than the SDK directly, so both entry points are
// stubbed onto the same spy.
vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApi: () => ({ Forms: { getFormByMarker } }),
  getApiSafe: () => ({ Forms: { getFormByMarker } }),
  isError: (v: unknown) => !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/checkout/delivery-methods');
};

// ── Fallback constants (mirror checkoutLabels / checkoutConfig) ────────────────
// We import them statically once; the mock above keeps their module untouched.
import { DELIVERY_PERKS, PICKUP_PERKS } from '@/app/data/checkoutConfig';
import {
  DELIVERY_METHOD_HOME_LABELS,
  DELIVERY_METHOD_LOCKER_LABELS,
  DELIVERY_METHOD_STORE_LABELS,
} from '@/lib/oneentry/checkout/delivery-methods';



const FALLBACK_HOME_PERKS = DELIVERY_PERKS.map((p) => p.text);
const FALLBACK_STORE_PERKS = PICKUP_PERKS.map((p) => p.text);

// ── Helper: builds a minimal valid OE form response ──────────────────────────
/**
 * The method picker is found by attribute *type*, not by marker — the marker
 * below is deliberately not the one production uses, to prove a rename in the
 * admin panel does not break the lookup.
 */
function makeForm(overrides: {
  listTitles?: { value: string; title: string; extended?: { value: string } | null }[];
  additionalFields?: Record<string, { value: string }>;
  omitAttr?: boolean;
  marker?: string;
}) {
  const { listTitles, additionalFields, omitAttr = false, marker = 'renamed_by_an_editor' } = overrides;
  return {
    attributes: omitAttr
      ? []
      : [
          {
            marker,
            type: 'list',
            position: 1,
            isVisible: true,
            localizeInfos: { title: 'Delivery method' },
            listTitles: listTitles ?? [],
            additionalFields: additionalFields ?? {},
          },
        ],
  };
}

// Full happy-path list items. Each option's `value` is the order-storage marker
// of the method it belongs to, which is how a card finds its option —
// deliberately listed out of card order here so a positional match would fail.
const FULL_LIST = [
  { value: 'locker', title: 'OE Locker Title', extended: { value: 'OE locker subtitle' } },
  { value: 'home', title: 'OE Home Title', extended: { value: 'OE home subtitle' } },
  { value: 'store_pickup', title: 'OE Store Title', extended: { value: 'OE store subtitle' } },
];

const FULL_ADDL = {
  home_free_delivery: { value: 'Free delivery' },
  home_partial_purchase: { value: 'Partial purchase' },
  'home_in-home-fitting': { value: 'In-home fitting' },
  store_pickup_free: { value: 'Free pickup' },
  store_pickup_partial_purchase: { value: 'Partial purchase OE' },
  store_pickup_fitting_room: { value: 'Fitting room OE' },
  locaer_text: { value: 'PIN hint from OE' },
};

beforeEach(() => {
  getFormByMarker.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — happy path', () => {
  it('maps all OE fields to DeliveryMethodInfo when form is fully populated', async () => {
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: FULL_LIST, additionalFields: FULL_ADDL }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home).toEqual({
      title: 'OE Home Title',
      subtitle: 'OE home subtitle',
      value: 'home',
      // Perks are grouped by marker prefix and ordered by marker, so
      // `home_free_delivery` < `home_in-home-fitting` < `home_partial_purchase`.
      perks: ['Free delivery', 'In-home fitting', 'Partial purchase'],
    });
    expect(info.store).toEqual({
      title: 'OE Store Title',
      subtitle: 'OE store subtitle',
      value: 'store_pickup',
      perks: ['Fitting room OE', 'Free pickup', 'Partial purchase OE'],
    });
    expect(info.locker).toEqual({
      title: 'OE Locker Title',
      subtitle: 'OE locker subtitle',
      value: 'locker',
      pinHint: 'PIN hint from OE',
    });
  });

  it('picks up perks an editor added without a code change', async () => {
    getFormByMarker.mockResolvedValue(
      makeForm({
        listTitles: FULL_LIST,
        additionalFields: { ...FULL_ADDL, home_gift_wrapping: { value: 'Gift wrapping' } },
      }),
    );
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.perks).toContain('Gift wrapping');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — missing delivery_method attribute', () => {
  it('returns full FALLBACK when the form has no list attribute', async () => {
    getFormByMarker.mockResolvedValue(makeForm({ omitAttr: true }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.title).toBe(DELIVERY_METHOD_HOME_LABELS.title);
    expect(info.home.subtitle).toBe(DELIVERY_METHOD_HOME_LABELS.subtitle);
    expect(info.home.perks).toEqual(FALLBACK_HOME_PERKS);

    expect(info.store.title).toBe(DELIVERY_METHOD_STORE_LABELS.title);
    expect(info.store.perks).toEqual(FALLBACK_STORE_PERKS);

    expect(info.locker.pinHint).toBe(DELIVERY_METHOD_LOCKER_LABELS.pinHint);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — missing listTitles entry for one method', () => {
  it('falls back to local title/subtitle for the missing method only; others use OE data', async () => {
    // The admin removed the locker option; the other two are still authored.
    const partialList = FULL_LIST.filter((o) => o.value !== 'locker');
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: partialList, additionalFields: FULL_ADDL }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    // The two authored methods should be from OE
    expect(info.home.title).toBe('OE Home Title');
    expect(info.store.title).toBe('OE Store Title');

    // no locker option → local fallback title/subtitle/value
    expect(info.locker.title).toBe(DELIVERY_METHOD_LOCKER_LABELS.title);
    expect(info.locker.subtitle).toBe(DELIVERY_METHOD_LOCKER_LABELS.subtitle);
    expect(info.locker.value).toBe('locker');
    // pinHint still comes from additionalFields (locaer_text is present)
    expect(info.locker.pinHint).toBe('PIN hint from OE');
  });

  it('matches cards to options by storage marker, not by admin order', async () => {
    // Same three options, reversed. A positional match would hand the home card
    // the locker option; matching on `value` keeps every card on its own.
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: [...FULL_LIST].reverse(), additionalFields: FULL_ADDL }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.value).toBe('home');
    expect(info.store.value).toBe('store_pickup');
    expect(info.locker.value).toBe('locker');
    expect(info.home.title).toBe('OE Home Title');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — missing additionalFields perks', () => {
  it('falls back to local perks list when additionalFields is empty', async () => {
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: FULL_LIST, additionalFields: {} }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.perks).toEqual(FALLBACK_HOME_PERKS);
    expect(info.store.perks).toEqual(FALLBACK_STORE_PERKS);
    // pinHint: no locker line → local fallback
    expect(info.locker.pinHint).toBe(DELIVERY_METHOD_LOCKER_LABELS.pinHint);
  });

  it('falls back only for methods with blank perks; other method perks stay from OE', async () => {
    // Only home perks present, store perks absent
    const partialAddl: Record<string, { value: string }> = {
      home_free_delivery: { value: 'Free delivery' },
      home_partial_purchase: { value: 'Partial purchase' },
      'home_in-home-fitting': { value: 'In-home fitting' },
      locaer_text: { value: 'PIN from OE' },
    };
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: FULL_LIST, additionalFields: partialAddl }));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    // home perks: OE populated → use OE, ordered by marker
    expect(info.home.perks).toEqual(['Free delivery', 'In-home fitting', 'Partial purchase']);
    // store perks: OE absent → local fallback
    expect(info.store.perks).toEqual(FALLBACK_STORE_PERKS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — OE returns IError', () => {
  it('returns FALLBACK when OE responds with a statusCode error object', async () => {
    getFormByMarker.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.title).toBe(DELIVERY_METHOD_HOME_LABELS.title);
    expect(info.store.title).toBe(DELIVERY_METHOD_STORE_LABELS.title);
    expect(info.locker.title).toBe(DELIVERY_METHOD_LOCKER_LABELS.title);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — SDK throws', () => {
  it('returns FALLBACK when SDK rejects', async () => {
    getFormByMarker.mockRejectedValue(new Error('network timeout'));
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.perks).toEqual(FALLBACK_HOME_PERKS);
    expect(info.store.perks).toEqual(FALLBACK_STORE_PERKS);
    expect(info.locker.pinHint).toBe(DELIVERY_METHOD_LOCKER_LABELS.pinHint);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadParcelLockers', () => {
  /** An `entity` attribute's list: the section row first, then the pages. */
  const LOCKER_ENTITY_FORM = {
    attributes: [
      {
        marker: 'checkout_locker_pickup_point',
        type: 'entity',
        position: 1,
        isVisible: true,
        localizeInfos: { title: 'Pickup Point' },
        listTitles: [
          { title: 'Parcel Lockers', value: { id: 560, depth: 0, parentId: null }, position: 0 },
          { title: 'Paddington Station', value: { id: 561, depth: 1, parentId: 560 }, position: 1 },
          { title: "King's Cross", value: { id: 563, depth: 1, parentId: 560 }, position: 2 },
        ],
        validators: {},
        additionalFields: {},
      },
    ],
  };

  it('returns each locker with the OE page id the order will reference', async () => {
    getFormByMarker.mockResolvedValue(LOCKER_ENTITY_FORM);
    const { loadParcelLockers } = await importFresh();

    expect(await loadParcelLockers()).toEqual([
      { oeId: 561, name: 'Paddington Station' },
      { oeId: 563, name: "King's Cross" },
    ]);
  });

  it('drops the containing section, which is a heading and not a pick-up point', async () => {
    getFormByMarker.mockResolvedValue(LOCKER_ENTITY_FORM);
    const { loadParcelLockers } = await importFresh();

    expect((await loadParcelLockers()).map((l) => l.oeId)).not.toContain(560);
  });

  it('returns an empty list when the tenant selected no pages', async () => {
    getFormByMarker.mockResolvedValue(makeForm({ listTitles: [] }));
    const { loadParcelLockers } = await importFresh();

    expect(await loadParcelLockers()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadCheckoutSuccessMessage', () => {
  it('returns the successMessage string when localizeInfos is populated', async () => {
    getFormByMarker.mockResolvedValue({
      localizeInfos: { successMessage: 'Your order has been placed!' },
    });
    const { loadCheckoutSuccessMessage } = await importFresh();
    const msg = await loadCheckoutSuccessMessage();

    expect(msg).toBe('Your order has been placed!');
  });

  it('returns null when localizeInfos is missing', async () => {
    getFormByMarker.mockResolvedValue({});
    const { loadCheckoutSuccessMessage } = await importFresh();
    const msg = await loadCheckoutSuccessMessage();

    expect(msg).toBeNull();
  });

  it('returns null when successMessage is an empty string', async () => {
    getFormByMarker.mockResolvedValue({
      localizeInfos: { successMessage: '' },
    });
    const { loadCheckoutSuccessMessage } = await importFresh();
    const msg = await loadCheckoutSuccessMessage();

    expect(msg).toBeNull();
  });

  it('returns null when OE responds with an IError object', async () => {
    getFormByMarker.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    const { loadCheckoutSuccessMessage } = await importFresh();
    const msg = await loadCheckoutSuccessMessage();

    expect(msg).toBeNull();
  });

  it('returns null when the SDK throws', async () => {
    getFormByMarker.mockRejectedValue(new Error('network timeout'));
    const { loadCheckoutSuccessMessage } = await importFresh();
    const msg = await loadCheckoutSuccessMessage();

    expect(msg).toBeNull();
  });
});
