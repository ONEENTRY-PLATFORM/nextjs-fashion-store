import { beforeEach, describe, expect, it, vi } from 'vitest';

const postFormsData = vi.fn();

vi.mock('../index', () => ({
  oneentry: { FormData: { postFormsData } },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./submit');
};

beforeEach(() => {
  postFormsData.mockReset();
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
        formData: [
          { marker: 'subscribe_new_drops_email', value: 'jane@example.com', type: 'string' },
        ],
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
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { submitForm } = await import('./submit');
    const result = await submitForm('subscribe_new_drops', []);
    expect(result.ok).toBe(false);
    vi.doUnmock('../index');
  });
});
