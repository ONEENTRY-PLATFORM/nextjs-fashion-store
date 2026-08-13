'use client';

import { createContext, useContext } from 'react';

/** Programmatic navigation that runs through the page transition. */
export type TransitionNavigate = (href: string, options?: { scroll?: boolean }, method?: 'push' | 'replace') => void;

const TransitionNavigationContext = createContext<TransitionNavigate | null>(null);

export const TransitionNavigationProvider = TransitionNavigationContext.Provider;

/** The animated navigator, or `null` when no `<TransitionProvider>` is mounted (Storybook, unit tests). */
export function useTransitionNavigate(): TransitionNavigate | null {
  return useContext(TransitionNavigationContext);
}
