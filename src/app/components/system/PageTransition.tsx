'use client';

import { TransitionRouter, useTransitionRouter, useTransitionState } from 'next-transition-router';
import React, { useCallback, useEffect, useRef } from 'react';

import { useMounted } from '@/app/hooks/useMounted';

import { type TransitionNavigate, TransitionNavigationProvider } from './TransitionNavigationContext';

/** Page transitions. */

/** Fade-out of the outgoing page, in ms. */
const LEAVE_MS = 180;

/** Fade-in of the incoming page. */
const ENTER_MS = 280;

/** Whether the visitor asked the OS for reduced motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Promise that settles after `ms` — how the router is held back while the leave animation plays. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Wraps the whole app so that every link click, wherever it is rendered, goes through the transition. */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const leave = useCallback(async (next: () => void) => {
    if (typeof window === 'undefined' || prefersReducedMotion()) {
      next();
      return;
    }

    // Scroll before navigating, not after: the shopper watches the page they already know slide back to the top, instead of being teleported there by `ScrollToTop` once the new route has mounted.
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    await wait(LEAVE_MS);
    next();
  }, []);

  const enter = useCallback(async (next: () => void) => {
    if (prefersReducedMotion()) {
      next();
      return;
    }
    await wait(ENTER_MS);
    next();
  }, []);

  return (
    <TransitionRouter auto leave={leave} enter={enter}>
      <TransitionNavigationBridge>{children}</TransitionNavigationBridge>
    </TransitionRouter>
  );
}

/** Publishes the router's animated `push`/`replace` on {@link TransitionNavigationProvider}, so the locale-aware `useRouter` in `src/lib/i18n/navigation.tsx` can animate programmatic navigation without importing `next-transition-router` itself. */
function TransitionNavigationBridge({ children }: { children: React.ReactNode }) {
  const router = useTransitionRouter();

  const navigate = useCallback<TransitionNavigate>(
    (href, options, method = 'push') => {
      if (method === 'replace') {
        router.replace(href, options);
        return;
      }
      router.push(href, options);
    },
    [router],
  );

  return <TransitionNavigationProvider value={navigate}>{children}</TransitionNavigationProvider>;
}

/** The animated content column. */
export function PageContent({ children }: { children: React.ReactNode }) {
  const { stage } = useTransitionState();
  const ref = useRef<HTMLDivElement>(null);
  // Link clicks are only intercepted once the tree has hydrated; before that a click is an ordinary full-page load.
  const hydrated = useMounted();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stage === 'leaving') {
      el.style.minHeight = `${el.offsetHeight}px`;
    } else {
      // Released as soon as the destination is mounted ('entering'), so the new page settles at its own height while it fades in rather than snapping a beat later.
      el.style.minHeight = '';
    }
  }, [stage]);

  return (
    // A flex column so a page that wants the full viewport can say `flex-1` instead of `min-h-screen`.
    <div
      ref={ref}
      data-stage={stage}
      data-hydrated={hydrated ? 'true' : 'false'}
      data-testid="page-transition"
      className="page-transition flex flex-1 flex-col"
    >
      {children}
    </div>
  );
}
