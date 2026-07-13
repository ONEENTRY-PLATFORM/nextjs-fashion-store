import { beforeEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is transparent in tests — invoke the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const getFormByMarker = vi.fn();

vi.mock('../index', () => ({
  getApi: () => ({ Forms: { getFormByMarker } }),
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./delivery-methods');
};

// ── Fallback constants (mirror checkoutLabels / checkoutConfig) ────────────────
// We import them statically once; the mock above keeps their module untouched.
import { DELIVERY_METHOD_HOME_LABELS, DELIVERY_METHOD_STORE_LABELS, DELIVERY_METHOD_LOCKER_LABELS } from '../../../app/data/checkoutLabels';
import { DELIVERY_PERKS, PICKUP_PERKS } from '../../../app/data/checkoutConfig';

const FALLBACK_HOME_PERKS  = DELIVERY_PERKS.map((p) => p.text);
const FALLBACK_STORE_PERKS = PICKUP_PERKS.map((p) => p.text);

// ── Helper: builds a minimal valid OE form response ──────────────────────────
function makeForm(overrides: {
  listTitles?: { value: string; title: string; extended?: { value: string } | null }[];
  additionalFields?: Record<string, { value: string }>;
  omitAttr?: boolean;
}) {
  const { listTitles, additionalFields, omitAttr = false } = overrides;
  return {
    attributes: omitAttr
      ? []
      : [
          {
            marker: 'delivery_method',
            listTitles: listTitles ?? [],
            additionalFields: additionalFields ?? {},
          },
        ],
  };
}

// Full happy-path list items
const FULL_LIST = [
  { value: 'courier', title: 'OE Home Title',   extended: { value: 'OE home subtitle'   } },
  { value: 'pickup',  title: 'OE Store Title',  extended: { value: 'OE store subtitle'  } },
  { value: 'locker',  title: 'OE Locker Title', extended: { value: 'OE locker subtitle' } },
];

const FULL_ADDL = {
  home_free_delivery:              { value: 'Free delivery' },
  home_partial_purchase:           { value: 'Partial purchase' },
  'home_in-home-fitting':          { value: 'In-home fitting' },
  store_pickup_free:               { value: 'Free pickup' },
  store_pickup_partial_purchase:   { value: 'Partial purchase OE' },
  store_pickup_fitting_room:       { value: 'Fitting room OE' },
  locaer_text:                     { value: 'PIN hint from OE' },
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
      perks: ['Free delivery', 'Partial purchase', 'In-home fitting'],
    });
    expect(info.store).toEqual({
      title: 'OE Store Title',
      subtitle: 'OE store subtitle',
      perks: ['Free pickup', 'Partial purchase OE', 'Fitting room OE'],
    });
    expect(info.locker).toEqual({
      title: 'OE Locker Title',
      subtitle: 'OE locker subtitle',
      pinHint: 'PIN hint from OE',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — missing delivery_method attribute', () => {
  it('returns full FALLBACK when the form has no delivery_method attribute', async () => {
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
    // listTitles has courier and pickup, but NOT locker
    const partialList = FULL_LIST.filter((it) => it.value !== 'locker');
    getFormByMarker.mockResolvedValue(
      makeForm({ listTitles: partialList, additionalFields: FULL_ADDL }),
    );
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    // courier and pickup should be from OE
    expect(info.home.title).toBe('OE Home Title');
    expect(info.store.title).toBe('OE Store Title');

    // locker not present in listTitles → local fallback title/subtitle
    expect(info.locker.title).toBe(DELIVERY_METHOD_LOCKER_LABELS.title);
    expect(info.locker.subtitle).toBe(DELIVERY_METHOD_LOCKER_LABELS.subtitle);
    // pinHint still comes from additionalFields (locaer_text is present)
    expect(info.locker.pinHint).toBe('PIN hint from OE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliveryMethodInfo — missing additionalFields perks', () => {
  it('falls back to local perks list when additionalFields is empty', async () => {
    getFormByMarker.mockResolvedValue(
      makeForm({ listTitles: FULL_LIST, additionalFields: {} }),
    );
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    expect(info.home.perks).toEqual(FALLBACK_HOME_PERKS);
    expect(info.store.perks).toEqual(FALLBACK_STORE_PERKS);
    // pinHint: no locaer_text → local fallback
    expect(info.locker.pinHint).toBe(DELIVERY_METHOD_LOCKER_LABELS.pinHint);
  });

  it('falls back only for methods with blank perks; other method perks stay from OE', async () => {
    // Only home perks present, store perks absent
    const partialAddl: Record<string, { value: string }> = {
      home_free_delivery:    { value: 'Free delivery' },
      home_partial_purchase: { value: 'Partial purchase' },
      'home_in-home-fitting': { value: 'In-home fitting' },
      locaer_text:           { value: 'PIN from OE' },
    };
    getFormByMarker.mockResolvedValue(
      makeForm({ listTitles: FULL_LIST, additionalFields: partialAddl }),
    );
    const { loadDeliveryMethodInfo } = await importFresh();
    const info = await loadDeliveryMethodInfo();

    // home perks: OE populated → use OE
    expect(info.home.perks).toEqual(['Free delivery', 'Partial purchase', 'In-home fitting']);
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
