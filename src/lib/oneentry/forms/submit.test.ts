import { beforeEach, describe, expect, it, vi } from 'vitest';

const postFormsData = vi.fn();
const revalidateTag = vi.fn();

vi.mock('../index', () => ({
  oneentry: { FormData: { postFormsData } },
  isOneEntryEnabled: true,
  isError: (v: unknown): v is { message?: string; statusCode?: number } =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

vi.mock('next/cache', () => ({
  revalidateTag,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./submit');
};

beforeEach(() => {
  postFormsData.mockReset();
  revalidateTag.mockReset();
});

describe('submitForm', () => {
  it('returns ok:true and forwards fields to the SDK', async () => {
    postFormsData.mockResolvedValue({});
    const { submitForm } = await importFresh();
    const result = await submitForm('subscribe_new_drops', [
      { marker: 'subscribe_new_drops_email', value: 'jane@example.com', type: 'string' },
    ]);
    expect(result).toEqual({ ok: true });
    expect(postFormsData).toHaveBeenCalledWith(
      expect.objectContaining({
        formIdentifier: 'subscribe_new_drops',
        formModuleConfigId: 0,
        moduleEntityIdentifier: '',
        formData: [
          { marker: 'subscribe_new_drops_email', value: 'jane@example.com', type: 'string' },
        ],
      }),
      'en_US',
    );
  });

  it('forwards binding.moduleConfigId and moduleEntityIdentifier when provided', async () => {
    postFormsData.mockResolvedValue({});
    const { submitForm } = await importFresh();
    await submitForm(
      'subscribe_new_drops',
      [{ marker: 'subscribe_new_drops_email', value: 'jane@example.com' }],
      { moduleConfigId: 52, moduleEntityIdentifier: 'subscribe' },
    );
    expect(postFormsData).toHaveBeenCalledWith(
      expect.objectContaining({
        formIdentifier: 'subscribe_new_drops',
        formModuleConfigId: 52,
        moduleEntityIdentifier: 'subscribe',
      }),
      'en_US',
    );
  });

  it('returns ok:false when SDK throws', async () => {
    postFormsData.mockRejectedValue(new Error('network'));
    const { submitForm } = await importFresh();
    const result = await submitForm('subscribe_new_drops', [
      { marker: 'subscribe_new_drops_email', value: 'x@y.z' },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('network');
  });

  it('defaults field type to "string" when omitted', async () => {
    postFormsData.mockResolvedValue({});
    const { submitForm } = await importFresh();
    await submitForm('any_form', [{ marker: 'note', value: 'hello' }]);
    expect(postFormsData.mock.calls[0][0].formData[0]).toMatchObject({ type: 'string' });
  });
});

describe('submitForm — disabled', () => {
  it('returns ok:false when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false, isError: () => false }));
    const { submitForm } = await import('./submit');
    const result = await submitForm('subscribe_new_drops', []);
    expect(result.ok).toBe(false);
    vi.doUnmock('../index');
  });
});

// ── revalidateTag tests — separate file to avoid module-cache contamination ───
// These live in submit.revalidateTag.test.ts
