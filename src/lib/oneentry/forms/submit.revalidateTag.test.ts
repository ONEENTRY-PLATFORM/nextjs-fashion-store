/**
 * Tests for `revalidateTag` call behaviour in submitForm.
 *
 * Kept in a separate file so `vi.resetModules()` calls in submit.test.ts
 * don't contaminate the module cache that the spy closure depends on.
 */
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

// Single import — no resetModules so the mock factory closure stays live.
import('./submit'); // pre-warm

let submitForm: (typeof import('./submit'))['submitForm'];

beforeEach(async () => {
  postFormsData.mockReset();
  revalidateTag.mockReset();
  submitForm = (await import('./submit')).submitForm;
});

describe('submitForm — revalidateTag calls on success', () => {
  it('calls revalidateTag("oe-reviews","max") and revalidateTag("oe-forms","max") for review_rating', async () => {
    postFormsData.mockResolvedValue({});
    await submitForm('review_rating', [{ marker: 'rating', value: '5' }]);
    expect(revalidateTag).toHaveBeenCalledWith('oe-reviews', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('oe-forms', 'max');
  });

  it('calls revalidateTag("oe-reviews","max") and revalidateTag("oe-forms","max") for review_feedback', async () => {
    postFormsData.mockResolvedValue({});
    await submitForm('review_feedback', [{ marker: 'text', value: 'great' }]);
    expect(revalidateTag).toHaveBeenCalledWith('oe-reviews', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('oe-forms', 'max');
  });

  it('calls revalidateTag("oe-forms","max") but NOT "oe-reviews" for an unrelated marker', async () => {
    postFormsData.mockResolvedValue({});
    await submitForm('subscribe_new_drops', [{ marker: 'email', value: 'a@b.com' }]);
    expect(revalidateTag).toHaveBeenCalledWith('oe-forms', 'max');
    const reviewCall = revalidateTag.mock.calls.find((c) => c[0] === 'oe-reviews');
    expect(reviewCall).toBeUndefined();
  });

  it('does NOT call revalidateTag when the SDK returns an IError', async () => {
    postFormsData.mockResolvedValue({ statusCode: 400, message: 'bad input' });
    await submitForm('review_rating', [{ marker: 'rating', value: '1' }]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
