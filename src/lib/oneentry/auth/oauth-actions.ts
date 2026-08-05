'use server';
/**
 * Google OAuth — the only part of the auth flow that legitimately runs on the
 * server (MCP `auth-provider`, "OAuth providers"):
 *
 *  • the CSRF `state` must live in an httpOnly cookie the browser cannot read;
 *  • the `code → tokens` exchange goes through OE, which holds the Google
 *    `client_secret`.
 *
 * The exchange stamps the **browser's** device fingerprint via
 * `deviceMetadata` on a throw-away instance. Without it OE would bind the
 * refresh token to this Node process's fingerprint, the browser's proactive
 * `/refresh` would get a `400`, and the shopper would be silently logged out
 * on their next visit. `setDeviceMetadata()` on the shared singleton is not an
 * option — its state is shared by every concurrent visitor.
 */
import { cookies } from 'next/headers';
import { createRequestApi, getApiSafe, isError } from '../index';

const GOOGLE_AUTH_MARKER = 'google';
const GOOGLE_OAUTH_STATE_COOKIE = 'oe_google_oauth_state';
const GOOGLE_OAUTH_RETURN_COOKIE = 'oe_google_oauth_return';
const GOOGLE_CALLBACK_PATH = '/auth/callback/google';

/** Minimal cookie-jar surface used here — keeps the module testable. */
interface CookieJar {
  set(name: string, value: string, opts: Record<string, unknown>): void;
  delete(name: string): void;
  get(name: string): { value: string } | undefined;
}

/**
 * Build the absolute OAuth redirect URI for a given browser origin.
 * @param {string} origin - Browser origin, e.g. `https://shop.example`.
 * @returns {string} Absolute callback URL registered with Google.
 */
function absoluteCallbackUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}${GOOGLE_CALLBACK_PATH}`;
}

export interface GoogleOAuthStart {
  ok: true;
  url: string;
}
export interface GoogleOAuthStartError {
  ok: false;
  error: string;
}

/**
 * Start the authorization-code flow: read `config.oauthAuthUrl` from the OE
 * provider (never hardcode Google's endpoint), build the authorize URL, and
 * park the CSRF `state` + the post-login return path in httpOnly cookies.
 * @param {string} origin     - Browser origin, used to build `redirect_uri`.
 * @param {string} [returnTo] - Local path to bounce back to after sign-in.
 * @returns {Promise<GoogleOAuthStart | GoogleOAuthStartError>} URL to redirect to.
 */
export async function getGoogleAuthUrlAction(
  origin: string,
  returnTo?: string,
): Promise<GoogleOAuthStart | GoogleOAuthStartError> {
  const api = getApiSafe();
  if (!api) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set' };
  }
  if (!origin || !/^https?:\/\//i.test(origin)) {
    return { ok: false, error: 'Invalid origin' };
  }
  try {
    const provider = await api.AuthProvider.getAuthProviderByMarker(GOOGLE_AUTH_MARKER);
    if (isError(provider)) {
      return { ok: false, error: provider.message ?? 'Google provider not found' };
    }
    const oauthAuthUrl = provider.config?.oauthAuthUrl;
    if (!oauthAuthUrl) {
      return { ok: false, error: 'Provider missing oauthAuthUrl' };
    }
    const state = crypto.randomUUID();
    const url = new URL(oauthAuthUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', absoluteCallbackUri(origin));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);

    const jar = (await cookies()) as unknown as CookieJar;
    const baseOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 10,
    };
    jar.set(GOOGLE_OAUTH_STATE_COOKIE, state, baseOpts);
    // Only allow local return paths, never full URLs — prevents open-redirect.
    const safeReturn = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/';
    jar.set(GOOGLE_OAUTH_RETURN_COOKIE, safeReturn, baseOpts);
    return { ok: true, url: url.toString() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google auth-url failed' };
  }
}

export interface GoogleCallbackContext {
  code: string;
  state: string;
  origin: string;
  /** `getApi().AuthProvider.getDeviceMetadata()` captured in the browser. */
  deviceMetadata: string;
}

export type GoogleExchangeResult =
  | {
      ok: true;
      userIdentifier: string;
      accessToken: string;
      refreshToken: string;
      returnTo: string;
    }
  | { ok: false; error: string };

/**
 * Exchange Google's `?code=` for an OE session.
 *
 * OE expects `{ code, redirect_uri }` — `client_id` / `client_secret` are
 * configured tenant-side. The tokens are handed back to the caller instead of
 * being written into a cookie: the browser owns the session (MCP `tokens`),
 * and `oauth()` — unlike `auth()` — does not place them in SDK state itself.
 * @param {GoogleCallbackContext} ctx - Code, CSRF state, origin, fingerprint.
 * @returns {Promise<GoogleExchangeResult>} Tokens + return path, or an error.
 */
export async function exchangeGoogleCodeAction(
  ctx: GoogleCallbackContext,
): Promise<GoogleExchangeResult> {
  if (!ctx.code) return { ok: false, error: 'Missing Google authorization code' };

  const jar = (await cookies()) as unknown as CookieJar;
  const savedState = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? '';
  const returnTo = jar.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value ?? '/';
  // Consume the CSRF pair immediately so the code can only be redeemed once.
  jar.delete(GOOGLE_OAUTH_STATE_COOKIE);
  jar.delete(GOOGLE_OAUTH_RETURN_COOKIE);

  if (!savedState || savedState !== ctx.state) {
    return { ok: false, error: 'OAuth state mismatch (possible CSRF)' };
  }

  // Per-request instance carrying the browser's fingerprint — never the
  // shared singleton (its state is visible to every concurrent visitor).
  const api = createRequestApi({ deviceMetadata: ctx.deviceMetadata });
  if (!api) return { ok: false, error: 'OneEntry is not configured' };

  try {
    const body = { code: ctx.code, redirect_uri: absoluteCallbackUri(ctx.origin) };
    const result = await api.AuthProvider.oauth(
      GOOGLE_AUTH_MARKER,
      body as unknown as Parameters<typeof api.AuthProvider.oauth>[1],
    );
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'Google sign-in rejected by OneEntry' };
    }
    const entity = result as {
      userIdentifier?: string;
      accessToken?: string;
      refreshToken?: string;
    };
    if (!entity.accessToken || !entity.refreshToken) {
      return { ok: false, error: 'OneEntry returned an incomplete session' };
    }
    return {
      ok: true,
      userIdentifier: entity.userIdentifier ?? '',
      accessToken: entity.accessToken,
      refreshToken: entity.refreshToken,
      returnTo: returnTo.startsWith('/') ? returnTo : '/',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed' };
  }
}
