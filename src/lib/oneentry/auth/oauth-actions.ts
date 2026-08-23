'use server';
/** Google OAuth — the only part of the auth flow that legitimately runs on the server (MCP `auth-provider`, "OAuth providers"): • the CSRF `state` must live in an httpOnly cookie the browser cannot read. */
import { cookies } from 'next/headers';
import type { IOauthData } from 'oneentry/types';

import { createRequestApi, getApiSafe, isError } from '@/lib/oneentry/index';
import { se } from '@/lib/oneentry/server-errors';

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

/** Build the absolute OAuth redirect URI for a given browser origin. */
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

/** Start the authorization-code flow: read `config.oauthAuthUrl` from the OE provider (never hardcode Google's endpoint), build the authorize URL, and park the CSRF `state` + the post-login return path in httpOnly cookies. */
export async function getGoogleAuthUrlAction(
  origin: string,
  returnTo?: string,
): Promise<GoogleOAuthStart | GoogleOAuthStartError> {
  const api = getApiSafe();
  if (!api) {
    return { ok: false, error: await se('oneEntryNotConfigured') };
  }
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: await se('googleClientIdMissing') };
  }
  if (!origin || !/^https?:\/\//i.test(origin)) {
    return { ok: false, error: await se('invalidOrigin') };
  }
  try {
    const provider = await api.AuthProvider.getAuthProviderByMarker(GOOGLE_AUTH_MARKER);
    if (isError(provider)) {
      return { ok: false, error: provider.message ?? (await se('googleProviderNotFound')) };
    }
    const oauthAuthUrl = provider.config?.oauthAuthUrl;
    if (!oauthAuthUrl) {
      return { ok: false, error: await se('providerMissingAuthUrl') };
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
    const safeReturn =
      typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
    jar.set(GOOGLE_OAUTH_RETURN_COOKIE, safeReturn, baseOpts);
    return { ok: true, url: url.toString() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('googleAuthUrlFailed') };
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

/** Exchange Google's `?code=` for an OE session. */
export async function exchangeGoogleCodeAction(ctx: GoogleCallbackContext): Promise<GoogleExchangeResult> {
  if (!ctx.code) return { ok: false, error: await se('googleMissingCode') };

  const jar = (await cookies()) as unknown as CookieJar;
  const savedState = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? '';
  const returnTo = jar.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value ?? '/';
  // Consume the CSRF pair immediately so the code can only be redeemed once.
  jar.delete(GOOGLE_OAUTH_STATE_COOKIE);
  jar.delete(GOOGLE_OAUTH_RETURN_COOKIE);

  if (!savedState || savedState !== ctx.state) {
    return { ok: false, error: await se('oauthStateMismatch') };
  }

  // Per-request instance carrying the browser's fingerprint — never the shared singleton (its state is visible to every concurrent visitor).
  const api = createRequestApi({ deviceMetadata: ctx.deviceMetadata });
  if (!api) return { ok: false, error: await se('oneEntryNotConfigured') };

  try {
    // OE resolves `client_id` / `client_secret` / `grant_type` from the provider config, so what goes on the wire is a subset of `IOauthData`.
    const body: Pick<IOauthData, 'code' | 'redirect_uri'> = {
      code: ctx.code,
      redirect_uri: absoluteCallbackUri(ctx.origin),
    };
    const result = await api.AuthProvider.oauth(GOOGLE_AUTH_MARKER, body as IOauthData);
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('googleRejected')) };
    }
    const entity = result as {
      userIdentifier?: string;
      accessToken?: string;
      refreshToken?: string;
    };
    if (!entity.accessToken || !entity.refreshToken) {
      return { ok: false, error: await se('incompleteSession') };
    }
    return {
      ok: true,
      userIdentifier: entity.userIdentifier ?? '',
      accessToken: entity.accessToken,
      refreshToken: entity.refreshToken,
      returnTo: returnTo.startsWith('/') ? returnTo : '/',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('googleFailed') };
  }
}
