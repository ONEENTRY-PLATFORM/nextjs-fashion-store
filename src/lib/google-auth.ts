/**
 * Google OAuth entry point per MCP `auth-provider` rule (authorization-code
 * flow). The user is redirected to Google (URL built server-side from the OE
 * provider's `config.oauthAuthUrl`), Google returns `?code=` to our callback
 * route, and the server exchanges the code via `AuthProvider.oauth('google',
 * { code, redirect_uri })`. The client never touches `client_secret`.
 *
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must be set (Google Cloud Console → APIs &
 * Services → Credentials → OAuth 2.0 Client ID). The Client ID must list
 * `${origin}/auth/callback/google` under "Authorised redirect URIs".
 */

import { getGoogleAuthUrlAction } from './oneentry/auth/actions';

/**
 * Kick off the Google OAuth redirect. Resolves with `void` on success (the
 * browser is navigating away by that point). Throws on config errors so the
 * caller can surface them in the UI.
 */
export async function startGoogleOAuth(returnTo?: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not in browser');
  const result = await getGoogleAuthUrlAction(window.location.origin, returnTo);
  if (!result.ok) throw new Error(result.error);
  window.location.href = result.url;
}
