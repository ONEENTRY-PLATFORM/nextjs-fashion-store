'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackActivity } from '../utils/track-activity';

// Fires a `page_view` on every client-side route change. Product and catalog
// pages already emit dedicated `product_view` / `category_view` events, so we
// skip them here to keep the analytics counts clean. Path is carried in meta
// so the back office can group by URL.
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/product/')) return;
    trackActivity({ type: 'page_view', meta: { path: pathname } });
  }, [pathname]);
  return null;
}
