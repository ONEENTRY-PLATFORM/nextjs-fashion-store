/** Password recovery over OneEntry's one-time-code flow. */
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { se } from '@/lib/oneentry/server-errors';

import { type AuthProviderInfo, getAuthProvidersAction } from './actions';

/** OE's system event for delivering a service code. */
export const PASSWORD_RESET_EVENT = 'send_code';

/** `type` argument of OE's change-password call: 1 = change, 2 = recovery. */
const CHANGE_TYPE_RECOVERY = 2;

/** Outcome of one recovery step — `error` is already shopper-readable. */
export interface PasswordResetResult {
  ok: boolean;
  error?: string;
}

/** Provider-configured shape of the one-time code. */
export interface PasswordResetPolicy {
  /** Auth-provider marker the recovery calls address (`email` on this tenant). */
  marker: string;
  /** Characters in the code OE mails out. */
  codeLength: number | null;
  /** Seconds before the code expires and a new one can be requested. */
  codeTtlSec: number | null;
}

/** The tenant's form-based (e-mail + password) auth provider. */
async function emailProvider(): Promise<AuthProviderInfo | null> {
  const providers = await getAuthProvidersAction();
  return providers.find((p) => p.type === 'email') ?? null;
}

/** Read the recovery policy so the UI can size its input and time its resend. */
export async function getPasswordResetPolicy(): Promise<PasswordResetPolicy | null> {
  const provider = await emailProvider();
  if (!provider) return null;
  return {
    marker: provider.identifier,
    codeLength: provider.codeLength,
    codeTtlSec: provider.codeTtlSec,
  };
}

/** Ask OE to mail a one-time code to the account behind `email`. OE answers `User not found` for an unknown address and `User already has a code` while a previous, unexpired code is still outstanding. */
export async function requestPasswordResetCodeAction(email: string): Promise<PasswordResetResult> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryNotConfigured') };
  const provider = await emailProvider();
  if (!provider) return { ok: false, error: await se('passwordResetUnavailable') };
  try {
    const result = await api.AuthProvider.generateCode(provider.identifier, email.trim(), PASSWORD_RESET_EVENT);
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('passwordResetCodeFailed')) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('passwordResetCodeFailed') };
  }
}

/** Check a code the shopper typed, before asking them for a new password. */
export async function verifyPasswordResetCodeAction(email: string, code: string): Promise<PasswordResetResult> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryNotConfigured') };
  const provider = await emailProvider();
  if (!provider) return { ok: false, error: await se('passwordResetUnavailable') };
  try {
    const result = await api.AuthProvider.checkCode(
      provider.identifier,
      email.trim(),
      PASSWORD_RESET_EVENT,
      code.trim(),
    );
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('passwordResetCodeInvalid')) };
    }
    // A wrong code is not an error response — OE answers `201 false`.
    if (result !== true) return { ok: false, error: await se('passwordResetCodeInvalid') };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('passwordResetCodeInvalid') };
  }
}

/** Spend the code and set a new password. */
export async function resetPasswordAction(
  email: string,
  code: string,
  newPassword: string,
): Promise<PasswordResetResult> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryNotConfigured') };
  const provider = await emailProvider();
  if (!provider) return { ok: false, error: await se('passwordResetUnavailable') };
  try {
    const result = await api.AuthProvider.changePassword(
      provider.identifier,
      email.trim(),
      PASSWORD_RESET_EVENT,
      CHANGE_TYPE_RECOVERY,
      code.trim(),
      newPassword,
      newPassword,
    );
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('passwordResetFailed')) };
    }
    if (result !== true) return { ok: false, error: await se('passwordResetFailed') };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('passwordResetFailed') };
  }
}
