/**
 * Registry of social providers we have client-side wiring for.
 *
 * OE returns the list of enabled providers via `getAuthProviders()`. For each
 * one we need (a) an icon to show and (b) a way to actually start the flow.
 * Google is fully wired via `requestGoogleIdToken()`; Apple and Facebook have
 * icons but no OAuth client yet, so we render them disabled with "Coming
 * soon". Providers OE returns that aren't in this registry render with just
 * their title (no icon) and disabled.
 */
export interface SocialProviderMeta {
  iconPath: string;
  /** `true` when we can actually trigger the OAuth flow client-side. */
  wired: boolean;
}

export const SOCIAL_PROVIDER_REGISTRY: Record<string, SocialProviderMeta> = {
  google: { iconPath: '/icons/auth/google.svg', wired: true },
  apple: { iconPath: '/icons/auth/apple.svg', wired: false },
  facebook: { iconPath: '/icons/auth/facebook.svg', wired: false },
};

/** Non-social identifiers we hide from the social row entirely. */
export const FORM_BASED_IDENTIFIERS = new Set(['email', 'phone', 'sms']);

export function isFormBasedProvider(identifier: string, type: string): boolean {
  return FORM_BASED_IDENTIFIERS.has(identifier) || FORM_BASED_IDENTIFIERS.has(type);
}
