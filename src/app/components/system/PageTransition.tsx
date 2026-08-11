'use client';

import { TransitionRouter, useTransitionRouter, useTransitionState } from 'next-transition-router';
import React, { useCallback, useEffect, useRef } from 'react';

import { useMounted } from '@/app/hooks/useMounted';

import { type TransitionNavigate, TransitionNavigationProvider } from './TransitionNavigationContext';

/**
 * Page transitions.
 *
 * The storefront used to swap routes the hard way: `<Header>` and `<Footer>`
 * were rendered *inside* every page component, so a navigation unmounted the
 * whole chrome and the route's `loading.tsx` painted a grey bar where the
 * header had just been — the header appeared to vanish, the page height jumped,
 * and the scroll position landed wherever the new document happened to be tall
 * enough to allow. The chrome now lives in the root layout (see
 * `app/[locale]/layout.tsx`) and only the content column below it changes.
 *
 * This module adds the missing half: a navigation is a sequence, not a swap.
 *
 * 1. `leave` — the outgoing content fades out while the page scrolls back to
 *    the top, *before* the router is allowed to move.
 * 2. the router navigates; Next paints the route's own `loading.tsx` skeleton
 *    into the same (still faded-out) container, so the shape of the
 *    destination is already right when it becomes visible.
 * 3. `enter` — the new content fades in and the height lock is released.
 *
 * Modelled on the `TransitionProvider` in the `oneentry-next-shop` project,
 * with two deliberate differences: the animation runs on CSS rather than GSAP
 * (~30 KB gzipped this storefront does not otherwise need), and the destination
 * skeleton comes from the route's `loading.tsx` instead of a hand-maintained
 * overlay — Next already picks the right one per route.
 *
 * @see {@link https://github.com/ismamz/next-transition-router next-transition-router}
 */

/**
 * Fade-out of the outgoing page, in ms. Kept short on purpose: it is dead time
 * added to every navigation. Mirrors `--page-leave-duration` in
 * `app/globals.css`.
 */
const LEAVE_MS = 180;

/** Fade-in of the incoming page. Mirrors `--page-enter-duration`. */
const ENTER_MS = 280;

/**
 * Whether the visitor asked the OS for reduced motion. Read at call time rather
 * than cached, so flipping the setting takes effect without a reload.
 *
 * @returns True when animations should be skipped.
 */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Promise that settles after `ms` — how the router is held back while the leave
 * animation plays.
 *
 * @param   ms - Delay in milliseconds.
 * @returns      A promise resolved after the delay.
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Wraps the whole app — chrome included — so that every link click, wherever it
 * is rendered, goes through the transition. Clicks are captured by delegation
 * on the document, so the header's and footer's links animate too even though
 * their markup sits next to (not inside) `<PageContent>`.
 *
 * Mounting it above the chrome also puts the animated router in reach of the
 * whole tree: {@link TransitionNavigationBridge} republishes it on a context of
 * our own, which is how programmatic `router.push` calls animate too (see
 * `src/lib/i18n/navigation.tsx`).
 *
 * @param   props          - Component props.
 * @param   props.children - The application tree.
 * @returns                  The tree wrapped in a transition router.
 */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const leave = useCallback(async (next: () => void) => {
    if (typeof window === 'undefined' || prefersReducedMotion()) {
      next();
      return;
    }

    // Scroll before navigating, not after: the shopper watches the page they
    // already know slide back to the top, instead of being teleported there by
    // `ScrollToTop` once the new route has mounted.
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

/**
 * Publishes the router's animated `push`/`replace` on
 * {@link TransitionNavigationProvider}, so the locale-aware `useRouter` in
 * `src/lib/i18n/navigation.tsx` can animate programmatic navigation without
 * importing `next-transition-router` itself.
 *
 * @param   props          - Component props.
 * @param   props.children - The application tree.
 * @returns                  The tree with the navigator in context.
 */
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

/**
 * The animated content column. Reflects the router's stage onto `data-stage`,
 * which `app/globals.css` turns into the fade-out / fade-in, and holds the
 * outgoing height while the content is invisible — without that, navigating
 * away from a long page (the homepage) to a short one collapses the document
 * mid-fade and the footer flies up the screen.
 *
 * @param   props          - Component props.
 * @param   props.children - The routed page.
 * @returns                  The animated content container.
 */
export function PageContent({ children }: { children: React.ReactNode }) {
  const { stage } = useTransitionState();
  const ref = useRef<HTMLDivElement>(null);
  // Link clicks are only intercepted once the tree has hydrated; before that a
  // click is an ordinary full-page load. E2E specs wait on this flag so they
  // assert against a client-side navigation rather than a document reload.
  const hydrated = useMounted();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stage === 'leaving') {
      el.style.minHeight = `${el.offsetHeight}px`;
    } else {
      // Released as soon as the destination is mounted ('entering'), so the
      // new page settles at its own height while it fades in rather than
      // snapping a beat later.
      el.style.minHeight = '';
    }
  }, [stage]);

  return (
    // A flex column so a page that wants the full viewport can say `flex-1`
    // instead of `min-h-screen` — which, now that the chrome sits outside,
    // would add a screen's worth of height to every route.
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
