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
