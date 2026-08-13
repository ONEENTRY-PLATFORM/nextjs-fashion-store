import { Suspense } from 'react';

import { GoogleCallbackClient } from '@/app/pages/auth/GoogleCallbackClient';

/** Google OAuth callback. */
export const dynamic = 'force-static';

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackClient />
    </Suspense>
  );
}
