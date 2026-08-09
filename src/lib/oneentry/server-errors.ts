/**
 * Server Action error copy, authored in the admin panel.
 *
 * These strings are thrown or returned by Server Actions and surface in the UI
 * through `e.message` / `res.error`, so a shopper can see them — they are the
 * last copy in the storefront that could reach the browser untranslated.
 *
 * The constants below stay in code as offline fallbacks: an OE outage is
 * exactly when an error message has to render, so it can never depend on a
 * successful CMS read. {@link se} overlays the admin value when there is one.
 *
 * Reads go through `getSystemSet`, which memoises per marker for five minutes,
 * so calling `se()` on an error path costs nothing after the first hit.
 *
 * @see .claude/temp/HARDCODED_TEXTS.md — the migration this closes
 */
import { DEFAULT_LOCALE } from './locale';
import { type Lang, t } from './system-text';

/** OE marker of the system-text set holding these messages. */
export const SERVER_ERRORS_MARKER = 'server_errors';

/** Offline defaults — kept byte-identical to what the actions used to throw. */
export const SERVER_ERROR_FALLBACKS = {
  signInFailed: 'Sign-in failed',
  signUpFailed: 'Sign-up failed',
  notAuthenticated: 'Not authenticated',
  notSignedIn: 'Not signed in',
  updateFailed: 'Update failed',
  network: 'Network error',
  oneEntryNotConfigured: 'OneEntry is not configured',
  oneEntryEnvNotConfigured: 'OneEntry env not configured',
  sdkNotInitialised: 'OneEntry SDK not initialised',
  sdkNotConfiguredServer: 'OneEntry SDK is not configured on the server.',
  sdkNotConfiguredEnv: 'OneEntry SDK is not configured. Set NEXT_PUBLIC_ONEENTRY_URL and NEXT_PUBLIC_ONEENTRY_TOKEN.',
  googleProviderNotFound: 'Google provider not found',
  googleRejected: 'Google sign-in rejected by OneEntry',
  googleFailed: 'Google sign-in failed',
  googleAuthUrlFailed: 'Google auth-url failed',
  googleMissingCode: 'Missing Google authorization code',
  providerMissingAuthUrl: 'Provider missing oauthAuthUrl',
  oauthStateMismatch: 'OAuth state mismatch (possible CSRF)',
  incompleteSession: 'OneEntry returned an incomplete session',
  googleClientIdMissing: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set',
  invalidOrigin: 'Invalid origin',
  unauthorized: 'Unauthorized',
  missingUserId: 'Missing user identifier',
  missingOrderId: 'Missing order id or storage',
  trackFailed: 'Track failed',
  noAuthOrGuestId: 'No auth or guest id',
  formSubmitFailed: 'Form submit failed',
  profileDisabled: 'OE_PROFILE is not enabled — set OE_PROFILE=1 in env and redeploy.',
} as const;

export type ServerErrorKey = keyof typeof SERVER_ERROR_FALLBACKS;

/** Camel key → attribute marker inside {@link SERVER_ERRORS_MARKER}. */
const MARKERS: Record<ServerErrorKey, string> = {
  signInFailed: 'server_errors_sign_in_failed',
  signUpFailed: 'server_errors_sign_up_failed',
  notAuthenticated: 'server_errors_not_authenticated',
  notSignedIn: 'server_errors_not_signed_in',
  updateFailed: 'server_errors_update_failed',
  network: 'server_errors_network',
  oneEntryNotConfigured: 'server_errors_oneentry_not_configured',
  oneEntryEnvNotConfigured: 'server_errors_oneentry_env_not_configured',
  sdkNotInitialised: 'server_errors_sdk_not_initialised',
  sdkNotConfiguredServer: 'server_errors_sdk_not_configured_server',
  sdkNotConfiguredEnv: 'server_errors_sdk_not_configured_env',
  googleProviderNotFound: 'server_errors_google_provider_not_found',
  googleRejected: 'server_errors_google_rejected',
  googleFailed: 'server_errors_google_failed',
  googleAuthUrlFailed: 'server_errors_google_auth_url_failed',
  googleMissingCode: 'server_errors_google_missing_code',
  providerMissingAuthUrl: 'server_errors_provider_missing_auth_url',
  oauthStateMismatch: 'server_errors_oauth_state_mismatch',
  incompleteSession: 'server_errors_incomplete_session',
  googleClientIdMissing: 'server_errors_google_client_id_missing',
  invalidOrigin: 'server_errors_invalid_origin',
  unauthorized: 'server_errors_unauthorized',
  missingUserId: 'server_errors_missing_user_id',
  missingOrderId: 'server_errors_missing_order_id',
  trackFailed: 'server_errors_track_failed',
  noAuthOrGuestId: 'server_errors_no_auth_or_guest_id',
  formSubmitFailed: 'server_errors_form_submit_failed',
  profileDisabled: 'server_errors_profile_disabled',
};

/**
 * Resolve one Server Action error message from the admin panel.
 *
 * @param   key    Message identifier.
 * @param   [lang] OE locale; defaults to {@link DEFAULT_LOCALE}, matching how
 *                 the rest of the auth actions address OE.
 * @returns The admin value, or the offline fallback when OE has no value.
 */
export async function se(key: ServerErrorKey, lang: Lang = DEFAULT_LOCALE): Promise<string> {
  return t(SERVER_ERRORS_MARKER, MARKERS[key], SERVER_ERROR_FALLBACKS[key], lang);
}
