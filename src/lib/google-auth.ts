/** Google OAuth entry point per MCP `auth-provider` rule (authorization-code flow). */

import { getGoogleAuthUrlAction } from './oneentry/auth/oauth-actions';

/** Kick off the Google OAuth redirect. */
export async function startGoogleOAuth(returnTo?: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not in browser');
  const result = await getGoogleAuthUrlAction(window.location.origin, returnTo);
  if (!result.ok) throw new Error(result.error);
  window.location.href = result.url;
}
