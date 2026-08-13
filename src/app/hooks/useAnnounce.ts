'use client';
import { useCallback } from 'react';

/** Sends a message to the global ARIA live region (#aria-live-region). */
export function useAnnounce() {
  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const el = document.getElementById(politeness === 'assertive' ? 'aria-live-assertive' : 'aria-live-polite');
    if (!el) return;
    // Clear then set — forces screen reader to re-announce even for identical messages
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }, []);

  return announce;
}
