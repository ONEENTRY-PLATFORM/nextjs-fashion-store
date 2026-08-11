'use client';

import { createContext, useContext } from 'react';

/**
 * Programmatic navigation that runs through the page transition.
 *
 * A tiny context rather than a direct `useTransitionRouter()` call inside
 * `src/lib/i18n/navigation.tsx` on purpose: that module is imported by nearly
 * every client component, and pulling `next-transition-router` in with it drags
 * the library — and its bare `next/navigation` import — into Storybook stories
 * and unit tests, where the Next.js router is mocked and the import fails to
 * resolve at all. Only `PageTransition` touches the library; everything else
 * asks this context whether an animated navigator is available.
 *
 * @param href    - Already locale-prefixed destination.
 * @param options - `next/navigation` navigate options.
 * @param method  - `push` (default) or `replace`.
 */
export type TransitionNavigate = (
  href: string,
  options?: { scroll?: boolean },
  method?: 'push' | 'replace',
) => void;

const TransitionNavigationContext = createContext<TransitionNavigate | null>(null);

export const TransitionNavigationProvider = TransitionNavigationContext.Provider;

/**
 * The animated navigator, or `null` when no `<TransitionProvider>` is mounted
 * (Storybook, unit tests) — callers fall back to the plain router then.
 *
 * @returns The navigate function, or `null`.
 */
export function useTransitionNavigate(): TransitionNavigate | null {
  return useContext(TransitionNavigationContext);
}
