'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useRouter } from '@/lib/i18n/navigation';
import { completeGoogleSignIn } from '@/lib/oneentry/auth/actions';
import { useT } from '@/lib/oneentry/labels/DictContext';

/** OAuth callback copy, keyed by the failure the redemption hit. */
export const OAUTH_ERROR_LABELS = {
  generic: "We couldn't complete Google sign-in. Please try again.",
  missingCode: 'Missing code or state from Google',
  signingIn: 'Signing you in…',
} as const;

const OAE = OAUTH_ERROR_LABELS;

/** Redeems Google's `?code=` for a OneEntry session and installs it in this browser, then bounces to the path saved when the flow started. */
export function GoogleCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  // StrictMode runs effects twice in dev; the authorization code is one-shot, so a second exchange would fail and bounce the shopper to an error page.
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const lMissingCode = useT('sign_in_google_missing_code', OAE.missingCode);
  const lGoogleFail = useT('sign_in_google_failed', OAE.generic);
  const lSigningIn = useT('sign_in_google_signing_in', OAE.signingIn);

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

    if (providerError) {
      fail(providerError);
      return;
    }
    if (!code || !state) {
      fail(lMissingCode);
      return;
    }

    void completeGoogleSignIn({ code, state, origin: window.location.origin })
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          fail(result.error);
          return;
        }
        const target = result.returnTo?.startsWith('/') ? result.returnTo : '/';
        // Let AuthContext (and anything else listening) re-read the session.
        window.dispatchEvent(new Event('auth-change'));
        router.replace(target);
      })
      .catch((err: unknown) => {
        fail(err instanceof Error ? err.message : lGoogleFail);
      });
  }, [params, router, lMissingCode, lGoogleFail]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center" data-testid="google-callback">
      <p className="text-sm tracking-[0.2em] text-gray-500 uppercase">{error ?? lSigningIn}</p>
    </div>
  );
}
