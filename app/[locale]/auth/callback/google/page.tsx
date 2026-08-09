import { Suspense } from 'react';

import { GoogleCallbackClient } from '../../../../../src/app/pages/auth/GoogleCallbackClient';

/**
 * Google OAuth callback.
 *
 * A Client Component, not a route handler: the session now lives in the
 * browser (MCP `tokens`), so the tokens returned by the code exchange have to
 * be installed here — and the exchange itself must be stamped with *this
 * browser's* device fingerprint, which only client code can read.
 */
export const dynamic = 'force-static';

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackClient />
    </Suspense>
  );
}
