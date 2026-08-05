import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAttributeSetByMarker = vi.fn();

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApiSafe: () => ({
    AttributesSets: { getAttributeSetByMarker },
  }),
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/labels/sign-in-labels');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('loadSignInSystemTexts', () => {
  it('returns flat Record of values for sign_in set', async () => {
    getAttributeSetByMarker.mockResolvedValue({
      schema: {
        sign_in_title:           { initialValue: { en_US: { value: 'Sign In' } } },
        sign_in_forgot_password: { initialValue: { en_US: { value: 'Forgot password?' } } },
        sign_in_or:              { initialValue: { en_US: { value: '' } } },
      },
    });
    const { loadSignInSystemTexts } = await importFresh();
    const result = await loadSignInSystemTexts();
    expect(result).toEqual({
      sign_in_title: 'Sign In',
      sign_in_forgot_password: 'Forgot password?',
    });
  });
});

describe('loadSignInSystemTexts — disabled', () => {
  it('returns empty record when SDK disabled', async () => {
    vi.resetModules();
    vi.doMock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()), getApiSafe: () => (null), isOneEntryEnabled: false }));
    const { loadSignInSystemTexts } = await import('@/lib/oneentry/labels/sign-in-labels');
    const result = await loadSignInSystemTexts();
    expect(result).toEqual({});
    vi.doUnmock('@/lib/oneentry/index');
  });
});
