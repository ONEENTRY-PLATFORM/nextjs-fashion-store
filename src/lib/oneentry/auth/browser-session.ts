/**
 * Browser-side session storage helpers shared by every shopper-scoped module.
 *
 * The SDK owns the tokens themselves (`refresh-token` is written by its
 * `saveFunction`, the access token lives in instance state). What the app has
 * to remember on its own is the OE **user identifier** — OE wants it as
 * `moduleEntityIdentifier` when creating form-data records (addresses, profile
 * extras, subscription prefs, service requests), and there is no way back to it
 * from the token alone without an extra `/me` round-trip.
 */
import { REFRESH_TOKEN_KEY } from '../index';

/** localStorage key holding the signed-in shopper's OE user identifier. */
export const IDENTIFIER_KEY = 'oe_user_identifier';

/**
 * Read the signed-in shopper's OE identifier.
 * @returns {string} The identifier, or `''` when signed out / unavailable.
 */
export function readUserIdentifier(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(IDENTIFIER_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Persist (or clear, when given `''`) the shopper's OE identifier.
 * @param {string} identifier - OE `userIdentifier` from the auth response.
 * @returns {void}
 */
export function writeUserIdentifier(identifier: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (identifier) localStorage.setItem(IDENTIFIER_KEY, identifier);
    else localStorage.removeItem(IDENTIFIER_KEY);
  } catch {
    /* private mode / quota — mutations needing it will simply no-op */
  }
}

/**
 * Read the persisted refresh token. Needed by `AuthProvider.logout`, which
 * takes it as an explicit argument rather than reading SDK state.
 * @returns {string} The stored refresh token, or `''`.
 */
export function readRefreshToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
