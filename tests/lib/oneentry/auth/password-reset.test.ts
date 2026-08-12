/**
 * Password recovery over OE's one-time-code flow.
 *
 * The three actions are thin, but each one wraps a response shape OE really
 * uses and a UI decision hangs off it: a wrong code is `201 false` (not an
 * error object), the provider is found by `type` rather than by a hardcoded
 * `email` marker, and recovery passes `type: 2` — passing `1` would ask OE to
 * change the password of an authenticated session that doesn't exist here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateCode = vi.fn();
const checkCode = vi.fn();
const changePassword = vi.fn();
const getAuthProviders = vi.fn();

const fakeApi = {
  AuthProvider: { generateCode, checkCode, changePassword, getAuthProviders },
};

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  isOneEntryEnabled: true,
  isError: (v: unknown) => !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
  getApiSafe: () => fakeApi,
  getLang: () => 'en_US',
}));

// `se()` reads the CMS for error copy; the fallback text is what matters here.
vi.mock('@/lib/oneentry/server-errors', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/oneentry/server-errors')>();
  return {
    ...actual,
    se: async (key: keyof typeof actual.SERVER_ERROR_FALLBACKS) => actual.SERVER_ERROR_FALLBACKS[key],
  };
});

vi.mock('@/lib/oneentry/catalog/product-previews-action', () => ({
  getProductPreviewsAction: vi.fn(async () => []),
}));

const {
  getPasswordResetPolicy,
  PASSWORD_RESET_EVENT,
  requestPasswordResetCodeAction,
  resetPasswordAction,
  verifyPasswordResetCodeAction,
} = await import('@/lib/oneentry/auth/password-reset');

/** Provider list as the live tenant answers it (config counters included). */
const PROVIDERS = [
  {
    identifier: 'google',
    type: 'oauth',
    localizeInfos: { en_US: { title: 'Google' } },
    isCheckCode: false,
    config: { systemCodeLength: 8, systemCodeTlsSec: 120 },
  },
  {
    identifier: 'email',
    type: 'email',
    localizeInfos: { en_US: { title: 'Email authentication' } },
    formIdentifier: 'signin',
    isCheckCode: false,
    config: { systemCodeLength: 8, systemCodeTlsSec: 120 },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getAuthProviders.mockResolvedValue(PROVIDERS);
});

describe('getPasswordResetPolicy', () => {
  it('reads the code length and TTL off the form-based provider', async () => {
    expect(await getPasswordResetPolicy()).toEqual({ marker: 'email', codeLength: 8, codeTtlSec: 120 });
  });

  it('is null when the tenant has no e-mail provider — recovery is not offered', async () => {
    getAuthProviders.mockResolvedValue([PROVIDERS[0]]);
    expect(await getPasswordResetPolicy()).toBeNull();
  });

  it('leaves unset counters null rather than inventing defaults', async () => {
    getAuthProviders.mockResolvedValue([{ ...PROVIDERS[1], config: {} }]);
    expect(await getPasswordResetPolicy()).toEqual({ marker: 'email', codeLength: null, codeTtlSec: null });
  });
});

describe('requestPasswordResetCodeAction', () => {
  it('asks OE for a code on the send_code event, trimming the address', async () => {
    generateCode.mockResolvedValue(undefined);
    const res = await requestPasswordResetCodeAction('  shopper@example.com ');
    expect(res).toEqual({ ok: true });
    expect(generateCode).toHaveBeenCalledWith('email', 'shopper@example.com', PASSWORD_RESET_EVENT);
  });

  it("surfaces OE's own message (unknown address, code still outstanding)", async () => {
    generateCode.mockResolvedValue({ statusCode: 400, message: 'User already has a code' });
    expect(await requestPasswordResetCodeAction('shopper@example.com')).toEqual({
      ok: false,
      error: 'User already has a code',
    });
  });

  it('reports recovery unavailable when no form-based provider exists', async () => {
    getAuthProviders.mockResolvedValue([PROVIDERS[0]]);
    const res = await requestPasswordResetCodeAction('shopper@example.com');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unavailable/i);
    expect(generateCode).not.toHaveBeenCalled();
  });
});

describe('verifyPasswordResetCodeAction', () => {
  it('accepts a code OE confirms', async () => {
    checkCode.mockResolvedValue(true);
    expect(await verifyPasswordResetCodeAction('shopper@example.com', ' 12345678 ')).toEqual({ ok: true });
    expect(checkCode).toHaveBeenCalledWith('email', 'shopper@example.com', PASSWORD_RESET_EVENT, '12345678');
  });

  it('rejects the `201 false` OE answers for a wrong code', async () => {
    checkCode.mockResolvedValue(false);
    const res = await verifyPasswordResetCodeAction('shopper@example.com', '00000000');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/incorrect|expired/i);
  });
});

describe('resetPasswordAction', () => {
  it('changes the password in recovery mode, repeating it for OE', async () => {
    changePassword.mockResolvedValue(true);
    expect(await resetPasswordAction('shopper@example.com', '12345678', 'n3wPassw0rd')).toEqual({ ok: true });
    expect(changePassword).toHaveBeenCalledWith(
      'email',
      'shopper@example.com',
      PASSWORD_RESET_EVENT,
      2,
      '12345678',
      'n3wPassw0rd',
      'n3wPassw0rd',
    );
  });

  it('surfaces an expired code', async () => {
    changePassword.mockResolvedValue({ statusCode: 400, message: 'User code is expired or incorrect' });
    expect(await resetPasswordAction('shopper@example.com', '12345678', 'n3wPassw0rd')).toEqual({
      ok: false,
      error: 'User code is expired or incorrect',
    });
  });

  it('treats a non-true answer as failure', async () => {
    changePassword.mockResolvedValue(false);
    const res = await resetPasswordAction('shopper@example.com', '12345678', 'n3wPassw0rd');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/change the password/i);
  });
});
