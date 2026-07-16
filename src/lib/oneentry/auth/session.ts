/**
 * Server-only cookie / access-token helpers for the OneEntry-backed auth
 * layer. Extracted from `auth/actions.ts` so mutation-side actions in OTHER
 * `'use server'` files (`activity/actions.ts`,
 * `catalog/service-request-submit-action.ts`) can transparently refresh the
 * access token without duplicating the refresh logic OR exposing an
 * async server-action helper that would leak the token to the client bundle.
 *
 * This module is **not** annotated `'use server'` on purpose — its helpers
 * touch cookies via `next/headers`, which already restricts them to server
 * code, but keeping them out of the RPC surface prevents any accidental
 * client-callable path to the access token.
 */
import { cookies } from 'next/headers';
import { oneentry, isError } from '../index';

export const AUTH_MARKER = 'email';
export const ACCESS_COOKIE = 'oe_access';
export const REFRESH_COOKIE = 'oe_refresh';
export const IDENTIFIER_COOKIE = 'oe_user';

export interface OeAuthEntity {
  userIdentifier: string;
  authProviderIdentifier: string;
  accessToken: string;
  refreshToken: string;
}

export interface CookieJar {
  set(name: string, value: string, opts: Record<string, unknown>): void;
  delete(name: string): void;
  get(name: string): { value: string } | undefined;
}

export async function setSessionCookies(jar: CookieJar, entity: OeAuthEntity): Promise<void> {
  const baseOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  jar.set(ACCESS_COOKIE, entity.accessToken, { ...baseOpts, maxAge: 60 * 60 * 24 });
  jar.set(REFRESH_COOKIE, entity.refreshToken, { ...baseOpts, maxAge: 60 * 60 * 24 * 7 });
  jar.set(IDENTIFIER_COOKIE, entity.userIdentifier, {
    ...baseOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookies(jar: CookieJar): Promise<void> {
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(IDENTIFIER_COOKIE);
}

/**
 * Read the access token, refreshing it transparently when the 24 h
 * `ACCESS_COOKIE` expired but the 7 d `REFRESH_COOKIE` is still alive.
 * Returns `null` for real guests (no refresh token) or when the refresh
 * itself failed — the caller falls back to the guest / anonymous path.
 *
 * Every mutation-side server action that historically read
 * `cookies().get(ACCESS_COOKIE)?.value` should use this instead — a
 * shopper who returned after > 24 h used to silently fall into the guest
 * branch, and any write (order, activity event, service request…) would
 * detach from their account until the next explicit login.
 */
export async function readAccessOrRefresh(): Promise<string | null> {
  const jar = (await cookies()) as unknown as CookieJar;
  const access = jar.get(ACCESS_COOKIE)?.value ?? null;
  if (access) return access;
  const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;
  if (!refresh || !oneentry) return null;
  try {
    const refreshed = await oneentry.AuthProvider.refresh(AUTH_MARKER, refresh);
    if (isError(refreshed)) {
      await clearSessionCookies(jar);
      return null;
    }
    await setSessionCookies(jar, refreshed);
    return refreshed.accessToken ?? null;
  } catch {
    await clearSessionCookies(jar);
    return null;
  }
}
