'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { trackActivity } from '@/app/utils/track-activity';

// Fires a `page_view` on every client-side route change.
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/product/')) return;
    trackActivity({ type: 'page_view', meta: { path: pathname } });
  }, [pathname]);
  return null;
}
