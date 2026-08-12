/**
 * Password recovery over OneEntry's one-time-code flow.
 *
 * OE has no "reset link" — there is no tokenised URL to mail out and no
 * endpoint that would consume one. Recovery is three calls against the
 * shopper's auth provider:
 *
 *   1. `generateCode`  — OE mints a code and delivers it through the user's
 *                        notification channel (the e-mail on their account).
 *   2. `checkCode`     — verifies what the shopper typed, without spending it.
 *   3. `changePassword` with `type: 2` (recovery) — sets the new password.
 *
 * All three run in the **browser**, for the same reason the rest of
 * `./actions.ts` does: they are shopper-scoped calls on the SDK singleton and
 * the device fingerprint OE binds tokens to has to be the browser's. The module
 * is deliberately NOT annotated `'use server'`.
 *
 * The code is minted per user, not per event: asking twice in a row answers
 * `User already has a code` until the previous one expires, so the UI has to
 * offer "resend" only after the TTL has run out. Both the code length and that
 * TTL are provider config in the admin panel — {@link getPasswordResetPolicy}
 * reads them rather than letting the screen assume `6 digits / 15 minutes`.
 */
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { se } from '@/lib/oneentry/server-errors';

import { type AuthProviderInfo, getAuthProvidersAction } from './actions';

/**
 * OE's system event for delivering a service code.
 *
 * Not a CMS marker: `generateCode` / `checkCode` / `changePassword` each take an
 * event identifier, and this is the built-in one OE routes service codes
 * through — verified against the tenant, where it answers `201`. Which template
 * the mail uses is an admin-side decision attached to that event, so the wording
 * never needs a code change here.
 */
export const PASSWORD_RESET_EVENT = 'send_code';

/** `type` argument of OE's change-password call: 1 = change, 2 = recovery. */
const CHANGE_TYPE_RECOVERY = 2;

/** Outcome of one recovery step — `error` is already shopper-readable. */
export interface PasswordResetResult {
  ok: boolean;
  error?: string;
}

/**
 * Provider-configured shape of the one-time code.
 *
 * `null` on either field means the admin panel left it unset; the caller keeps
 * its own presentation default rather than inventing a limit OE doesn't have.
 */
export interface PasswordResetPolicy {
  /** Auth-provider marker the recovery calls address (`email` on this tenant). */
  marker: string;
  /** Characters in the code OE mails out. */
  codeLength: number | null;
  /** Seconds before the code expires and a new one can be requested. */
  codeTtlSec: number | null;
}

/**
 * The tenant's form-based (e-mail + password) auth provider.
 *
 * Looked up by `type`, not by a hardcoded `'email'` marker — a merchant may
 * rename the provider, and social providers must never be picked up here.
 */
async function emailProvider(): Promise<AuthProviderInfo | null> {
  const providers = await getAuthProvidersAction();
  return providers.find((p) => p.type === 'email') ?? null;
}

/**
 * Read the recovery policy so the UI can size its input and time its resend.
 *
 * @returns The policy, or `null` when the tenant has no e-mail provider (then
 *          recovery is not offered at all).
 */
export async function getPasswordResetPolicy(): Promise<PasswordResetPolicy | null> {
  const provider = await emailProvider();
  if (!provider) return null;
  return {
    marker: provider.identifier,
    codeLength: provider.codeLength,
    codeTtlSec: provider.codeTtlSec,
  };
}

/**
 * Ask OE to mail a one-time code to the account behind `email`.
 *
 * OE answers `User not found` for an unknown address and `User already has a
 * code` while a previous, unexpired code is still outstanding. Both are
 * surfaced verbatim: this storefront already tells a shopper when their
 * sign-in credentials are wrong, so hiding account existence only here would
 * buy no privacy while leaving them stuck on a screen that appears to work.
 *
 * @param email - Address the shopper signs in with.
 * @returns       `{ ok: true }` once OE accepted the request.
 */
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

/**
 * Check a code the shopper typed, before asking them for a new password.
 *
 * Verification does not consume the code — {@link resetPasswordAction} passes
 * it again — so this is purely to fail fast on a typo instead of losing the
 * password the shopper just composed.
 *
 * @param email - Address the code was sent to.
 * @param code  - What the shopper typed.
 * @returns       `{ ok: true }` when OE recognised the code.
 */
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

/**
 * Spend the code and set a new password.
 *
 * @param email       - Address the code was sent to.
 * @param code        - The verified one-time code.
 * @param newPassword - Password to set; passed twice, as OE compares them
 *                      itself and answers `Passwords aren't correct` on a
 *                      mismatch.
 * @returns             `{ ok: true }` when the password was changed; the caller
 *                      can then sign the shopper straight in.
 */
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
