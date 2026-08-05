'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeGoogleSignIn } from '../../../lib/oneentry/auth/actions';

/**
 * Redeems Google's `?code=` for a OneEntry session and installs it in this
 * browser, then bounces to the path saved when the flow started.
 *
 * Runs client-side on purpose: `AuthProvider.oauth` binds the refresh token to
 * the `x-device-metadata` fingerprint of the issuing request, so the exchange
 * has to be stamped with the browser's fingerprint (captured here, forwarded
 * to the Server Action that holds the CSRF cookie). A server-issued token
 * would be refused by the proactive `/refresh` from this browser and the
 * shopper would be silently signed out.
 */
export function GoogleCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  // StrictMode runs effects twice in dev; the authorization code is one-shot,
  // so a second exchange would fail and bounce the shopper to an error page.
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const providerError = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    const fail = (message: string) => {
      const url = new URL('/', window.location.origin);
      url.searchParams.set('googleAuthError', message);
      router.replace(`${url.pathname}${url.search}`);
    };

    if (providerError) { fail(providerError); return; }
    if (!code || !state) { fail('Missing code or state from Google'); return; }

    void completeGoogleSignIn({ code, state, origin: window.location.origin })
      .then((result) => {
        if (!result.ok) { setError(result.error); fail(result.error); return; }
        const target = result.returnTo?.startsWith('/') ? result.returnTo : '/';
        // Let AuthContext (and anything else listening) re-read the session.
        window.dispatchEvent(new Event('auth-change'));
        router.replace(target);
      })
      .catch((err: unknown) => {
        fail(err instanceof Error ? err.message : 'Google sign-in failed');
      });
  }, [params, router]);

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-6 text-center"
      data-testid="google-callback"
    >
      <p className="text-sm tracking-[0.2em] uppercase text-gray-500">
        {error ?? 'Signing you in…'}
      </p>
    </div>
  );
}
