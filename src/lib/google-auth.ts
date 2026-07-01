/**
 * Google Identity Services (GIS) helper — request a Google OAuth access
 * token via the `initTokenClient` popup. The returned access token is
 * meant to be forwarded to the OneEntry `AuthProvider.oauth('google', ...)`
 * endpoint server-side; OE then calls Google's `/userinfo` to verify the
 * token and resolve the user.
 *
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must be set (Google Cloud Console → APIs &
 * Services → Credentials → OAuth 2.0 Client ID). The Client ID must list
 * every origin you sign in from under "Authorised JavaScript origins".
 */

const GIS_SCRIPT_ID = 'google-identity-services';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GsiTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GsiOauth2API {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
    prompt?: string;
  }) => GsiTokenClient;
}

interface GsiGlobal {
  accounts?: { oauth2?: GsiOauth2API };
}

declare global {
  interface Window {
    google?: GsiGlobal;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load GSI script')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GSI script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Show the Google account chooser popup and resolve with an OAuth `access
 * token` that the server can pass to OneEntry. Throws when the popup is
 * blocked, when the user closes it, when Google returns an error, or when
 * the client ID is not configured.
 */
export async function requestGoogleAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
  }
  await loadGsiScript();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Google Identity Services unavailable');

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (resp) => {
        if (resp.access_token) settle(() => resolve(resp.access_token!));
        else settle(() => reject(new Error(resp.error_description || resp.error || 'Google did not return an access token')));
      },
      error_callback: (err) => {
        settle(() => reject(new Error(err.message ?? err.type ?? 'Google sign-in cancelled')));
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Back-compat alias for the older helper that returned an `id_token`.
 * OE on this tenant expects the OAuth2 access token format, so both
 * helpers now resolve to the same value.
 */
export const requestGoogleIdToken = requestGoogleAccessToken;
