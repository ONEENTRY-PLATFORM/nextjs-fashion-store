import { defineOneEntry } from 'oneentry';
import type { IError } from 'oneentry/dist/base/utils';

const url = process.env.ONEENTRY_URL ?? '';
const token = process.env.ONEENTRY_TOKEN ?? '';

export const isOneEntryEnabled = Boolean(url && token);

/**
 * Singleton SDK instance. Exported for backwards compatibility with modules
 * that already imported it; new code should call `getApi()` — the MCP-native
 * accessor — so we have a single place to swap the instance later (e.g. for
 * `reDefine()` during authorization).
 */
export const oneentry = isOneEntryEnabled ? defineOneEntry(url, { token }) : null;

export type OneEntryClient = NonNullable<typeof oneentry>;

/**
 * MCP-preferred accessor. Returns the singleton SDK instance and throws
 * loudly when OE env vars aren't configured — catches deploy-time misconfig
 * instead of silently returning `null` and letting downstream code fail with
 * an obscure "cannot read property of null" runtime error.
 */
export function getApi(): OneEntryClient {
  if (!oneentry) {
    throw new Error(
      'OneEntry SDK is not configured. Set ONEENTRY_URL and ONEENTRY_TOKEN.',
    );
  }
  return oneentry;
}

/**
 * User-scoped SDK instance. Because the SDK is stateful, calling
 * `setAccessToken` on the singleton would race across concurrent server
 * actions — so we mint a fresh instance per call, wire the user's Bearer
 * token onto it, and let it garbage-collect after the request finishes.
 *
 * Callers pass the freshly-read cookie access token. The instance carries
 * both the app token (for tenant routing) and the user token (for auth).
 * Returns `null` if the SDK isn't configured (parity with `getApi()`
 * behaviour when the env vars are absent).
 */
export function getUserApi(accessToken: string, refreshToken?: string): OneEntryClient | null {
  if (!url || !token) return null;
  const api = defineOneEntry(url, { token });
  api.AuthProvider.setAccessToken(accessToken);
  if (refreshToken) api.AuthProvider.setRefreshToken(refreshToken);
  return api;
}

/**
 * Guest-scoped SDK instance. Same rationale as `getUserApi` — a fresh
 * per-request instance so `setGuestId` doesn't leak between visitors on a
 * shared singleton. The `x-guest-id` header rides along on unauthenticated
 * requests (cart / wishlist / activity / guest checkout).
 */
export function getGuestApi(guestId: string): OneEntryClient | null {
  if (!url || !token) return null;
  return defineOneEntry(url, { token, guestId });
}

/**
 * Alias for the SDK's `IError`. Re-exported so app code can `import { OeError }
 * from '@/lib/oneentry'` without reaching into `oneentry/dist/base/utils`.
 */
export type OeError = IError;

/**
 * Type-guard for the SDK's `IError`. Narrows to `IError` on true — and,
 * critically, narrows the sibling union arm (`IAuthEntity`, `IProductEntity`,
 * …) on false, so callers can `if (isError(r)) return; r.accessToken`.
 */
export function isError<T>(value: T | IError): value is IError {
  return typeof value === 'object'
    && value !== null
    && 'statusCode' in value
    && typeof (value as { statusCode: unknown }).statusCode === 'number';
}
