/** Browser-side session storage helpers shared by every shopper-scoped module. */
import { REFRESH_TOKEN_KEY } from '@/lib/oneentry/index';

/** localStorage key holding the signed-in shopper's OE user identifier. */
export const IDENTIFIER_KEY = 'oe_user_identifier';

/** Read the signed-in shopper's OE identifier. */
export function readUserIdentifier(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(IDENTIFIER_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Persist (or clear, when given `''`) the shopper's OE identifier. */
export function writeUserIdentifier(identifier: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (identifier) localStorage.setItem(IDENTIFIER_KEY, identifier);
    else localStorage.removeItem(IDENTIFIER_KEY);
  } catch {
    /* private mode / quota — mutations needing it will simply no-op */
  }
}

/** Read the persisted refresh token. */
export function readRefreshToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
