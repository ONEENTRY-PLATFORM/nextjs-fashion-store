/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

/** OAuth failure banner copy, keyed by the `?googleAuthError=` code family. */
export const OAUTH_ERROR_LABELS = {
  accessDenied: 'Google sign-in was cancelled. Please try again.',
  token: "We couldn't verify your Google account. Please try again.",
  state: 'Sign-in session expired. Please try again.',
  generic: "We couldn't complete Google sign-in. Please try again.",
  missingCode: 'Missing code or state from Google',
  signingIn: 'Signing you in…',
} as const;
