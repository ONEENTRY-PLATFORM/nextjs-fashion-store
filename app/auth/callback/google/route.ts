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
/**
 * Reconstruct the externally-visible origin from proxy headers. `new URL(request.url)`
 * in production behind a reverse proxy (as on OE cloud hosting) returns the
 * container-internal URL (`http://localhost:3000/...`) because Node.js only
 * sees the internal address — not the public host the browser hit. Passing that
 * bogus origin to Google as `redirect_uri` at code-exchange time fails Google's
 * "must match the authorization request URI" check and OE surfaces it as a
 * generic "We couldn't pass the oauth authentication" error. It also sends the
 * failure redirect to `http://localhost:3000/` instead of the real app URL.
 */
export function externalOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  if (host) {
    // Public hosting hits us over HTTPS at the edge, so `redirect_uri` sent
    // to Google at exchange time must be HTTPS to match the one used at
    // authorization time. Some reverse-proxy setups either omit
    // `x-forwarded-proto` entirely OR forward it as literal `http` (the
    // container-internal scheme). Trusting either variant produces an
    // `http://` redirect_uri that Google rejects with mismatch, and OE
    // surfaces the failure as a generic "We couldn't pass the oauth
    // authentication" error. So: force `https` for non-loopback hosts,
    // ignore the header. Loopback keeps `http`.
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
    const proto = isLocal ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = externalOrigin(request);
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
