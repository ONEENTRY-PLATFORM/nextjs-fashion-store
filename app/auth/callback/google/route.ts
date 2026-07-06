import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCodeAction } from '@/lib/oneentry/auth/actions';

/**
 * Google OAuth callback per MCP `auth-provider` rule. Google redirects here
 * with `?code=&state=` after the user consents. We hand both to the server
 * action which:
 *   1. Verifies the CSRF state cookie set at OAuth start.
 *   2. Calls `AuthProvider.oauth('google', { code, redirect_uri })`.
 *   3. Sets our session cookies from the returned entity.
 * On success we redirect to the `returnTo` path saved in the start step; on
 * failure we bounce back to `/` with a `?googleAuthError=` for the modal
 * to surface.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error');

  if (providerError) {
    const url = new URL('/', origin);
    url.searchParams.set('googleAuthError', providerError);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    const url = new URL('/', origin);
    url.searchParams.set('googleAuthError', 'Missing code or state from Google');
    return NextResponse.redirect(url);
  }

  const result = await exchangeGoogleCodeAction({ code, state, origin });

  if (!result.ok) {
    const url = new URL('/', origin);
    url.searchParams.set('googleAuthError', result.error);
    return NextResponse.redirect(url);
  }

  const target = result.returnTo && result.returnTo.startsWith('/') ? result.returnTo : '/';
  return NextResponse.redirect(new URL(target, origin));
}
