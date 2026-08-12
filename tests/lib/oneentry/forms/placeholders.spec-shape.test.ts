import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFormByMarker = vi.fn();

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApiSafe: () => ({ Forms: { getFormByMarker } }),
  isError: (v: unknown) => !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/forms/placeholders');
};

beforeEach(() => {
  getFormByMarker.mockReset();
});

/**
 * Shaped after the tenant's real `checkout_home_delivery_guest` payload: the
 * attribute carries its own type, order, label, placeholder and validators, and
 * the placeholder's additional-field marker differs per attribute.
 */
const RAW_FORM = {
  localizeInfos: { en_US: { title: 'Guest home delivery', successMessage: 'Placed!' } },
  attributes: [
    {
      marker: 'checkout_home_guest_city',
      type: 'string',
      position: 6,
      isVisible: true,
      localizeInfos: { en_US: { title: 'City' } },
      listTitles: [],
      validators: {
        trimValidator: true,
        requiredValidator: { strict: true },
        stringInspectionValidator: { stringMin: '2', stringMax: '20', stringLength: 0 },
      },
      additionalFields: { placeholder_city: { type: 'string', value: 'London' } },
    },
    {
      marker: 'delivery_method_guest',
      type: 'list',
      position: 1,
      isVisible: true,
      localizeInfos: { en_US: { title: 'Delivery method' } },
      listTitles: [
        { title: 'Store Pickup', value: 'pickup', position: 2, extended: { value: 'Ready within 2 hours' } },
        { title: 'Home Delivery', value: 'courier', position: 1, extended: { value: '2-5 business days' } },
      ],
      validators: { requiredValidator: { strict: true } },
      additionalFields: {},
    },
    {
      marker: 'checkout_home_guest_special_instrations',
      type: 'string',
      position: 8,
      isVisible: true,
      localizeInfos: { en_US: { title: 'Special Instructions (optional)' } },
      listTitles: [],
      validators: { stringInspectionValidator: { stringMin: 0, stringMax: '200', stringLength: 0 } },
      additionalFields: { placeholder_special_instruction: { type: 'string', value: 'Gate code, floor, etc.' } },
    },
  ],
};

describe('loadFormContent — field specification', () => {
  it('orders fields by position, not by the order OE listed them', async () => {
    getFormByMarker.mockResolvedValue(RAW_FORM);
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_home_delivery_guest', 'en_US');

    expect(form.fields.map((f) => f.marker)).toEqual([
      'delivery_method_guest',
      'checkout_home_guest_city',
      'checkout_home_guest_special_instrations',
    ]);
  });

  it('carries the attribute type and label so a field can be found without its marker', async () => {
    getFormByMarker.mockResolvedValue(RAW_FORM);
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_home_delivery_guest', 'en_US');

    expect(form.fields[0].type).toBe('list');
    expect(form.attributes.checkout_home_guest_city.title).toBe('City');
  });

  it('resolves the placeholder by prefix, whatever the admin named the field', async () => {
    getFormByMarker.mockResolvedValue(RAW_FORM);
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_home_delivery_guest', 'en_US');

    expect(form.attributes.checkout_home_guest_city.placeholder).toBe('London');
    // Singular `..._instruction`, where the sibling form spells it plural.
    expect(form.attributes.checkout_home_guest_special_instrations.placeholder).toBe('Gate code, floor, etc.');
  });

  it('decodes validators, treating a 0 bound as "no bound"', async () => {
    getFormByMarker.mockResolvedValue(RAW_FORM);
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_home_delivery_guest', 'en_US');

    expect(form.attributes.checkout_home_guest_city.limits).toEqual({
      required: true,
      min: 2,
      max: 20,
      email: false,
      trim: true,
    });
    expect(form.attributes.checkout_home_guest_special_instrations.limits).toMatchObject({
      required: false,
      min: null,
      max: 200,
    });
  });

  it('sorts list options by their admin position and keeps the secondary line', async () => {
    getFormByMarker.mockResolvedValue(RAW_FORM);
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_home_delivery_guest', 'en_US');

    expect(form.attributes.delivery_method_guest.options).toEqual([
      {
        title: 'Home Delivery',
        value: 'courier',
        extended: '2-5 business days',
        entityId: null,
        depth: null,
        parentId: null,
      },
      {
        title: 'Store Pickup',
        value: 'pickup',
        extended: 'Ready within 2 hours',
        entityId: null,
        depth: null,
        parentId: null,
      },
    ]);
  });

  it('turns an entity option into its page id, keeping the tree position', async () => {
    getFormByMarker.mockResolvedValue({
      attributes: [
        {
          marker: 'checkout_store_pickup_guest_store',
          type: 'entity',
          position: 1,
          isVisible: true,
          localizeInfos: { en_US: { title: 'Select Store' } },
          listTitles: [
            { title: 'Store Locations', value: { id: 9, depth: 0, parentId: null }, position: 0 },
            { title: 'Oxford Street', value: { id: 169, depth: 1, parentId: 9 }, position: 1 },
          ],
          validators: {},
          additionalFields: {},
        },
      ],
    });
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('checkout_store_pickup_guest', 'en_US');

    expect(form.attributes.checkout_store_pickup_guest_store.options).toEqual([
      { title: 'Store Locations', value: '9', extended: '', entityId: 9, depth: 0, parentId: null },
      { title: 'Oxford Street', value: '169', extended: '', entityId: 169, depth: 1, parentId: 9 },
    ]);
  });

  it('treats a missing isVisible flag as visible', async () => {
    getFormByMarker.mockResolvedValue({
      attributes: [{ marker: 'name', type: 'string', position: 1, localizeInfos: {}, listTitles: [], validators: {} }],
    });
    const { loadFormContent } = await importFresh();
    const form = await loadFormContent('legacy_form', 'en_US');

    expect(form.fields[0].isVisible).toBe(true);
  });
});
