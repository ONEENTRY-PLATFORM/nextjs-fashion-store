import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAttributeSetByMarker = vi.fn();

vi.mock('../index', () => ({
  oneentry: {
    AttributesSets: { getAttributeSetByMarker },
  },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./account-labels');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('loadAccountSystemTexts', () => {
  it('skips empty / non-string initialValue', async () => {
    getAttributeSetByMarker.mockResolvedValue({
      schema: {
        a: { initialValue: { en_US: { value: '' } } },
        b: { initialValue: { en_US: { value: 'ok' } } },
        c: { initialValue: { en_US: {} } },
        d: { initialValue: null },
        e: {},
      },
    });
    const { loadAccountSystemTexts } = await importFresh();
    const result = await loadAccountSystemTexts();
    expect(result.user_account).toEqual({ b: 'ok' });
  });

  it('returns Record per marker with extracted values', async () => {
    getAttributeSetByMarker.mockImplementation(async (marker: string) => {
      if (marker === 'my_bonuses') {
        return {
          schema: {
            my_bonuses_title: {
              initialValue: { en_US: { value: 'My Bonuses (from CMS)' } },
            },
          },
        };
      }
      return null;
    });
    const { loadAccountSystemTexts, ACCOUNT_SET_MARKERS } = await importFresh();
    const result = await loadAccountSystemTexts();
    expect(getAttributeSetByMarker).toHaveBeenCalled();
    expect(getAttributeSetByMarker.mock.calls.map(c => c[0])).toEqual(
      expect.arrayContaining([...ACCOUNT_SET_MARKERS]),
    );
    expect(Object.keys(result)).toEqual(expect.arrayContaining([...ACCOUNT_SET_MARKERS]));
    expect(result.my_bonuses).toEqual({ my_bonuses_title: 'My Bonuses (from CMS)' });
    expect(result.my_orders).toEqual({});
    expect(result.user_account).toEqual({});
  });

});

describe('loadAccountSystemTexts — disabled', () => {
  it('returns empty dicts for every marker when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadAccountSystemTexts, ACCOUNT_SET_MARKERS } = await import('./account-labels');
    const result = await loadAccountSystemTexts();
    for (const m of ACCOUNT_SET_MARKERS) {
      expect(result[m]).toEqual({});
    }
    vi.doUnmock('../index');
  });
});
