import { defineOneEntry } from 'oneentry';
import type { IError } from 'oneentry/dist/base/utils';

/**
 * Canonical OneEntry SDK entry point (MCP `sdk-init` / `tokens` rules).
 *
 * The SDK is isomorphic: the very same singleton serves Server Components /
 * ISR fetchers (app token only) and the browser (app token + the shopper's
 * refresh token installed by {@link reDefine}). Everything that needs an SDK
 * handle goes through {@link getApi} so there is exactly one place where the
 * instance can be swapped.
 *
 * `NEXT_PUBLIC_*` is required because auth (`AuthProvider.auth` / `signUp`)
 * must run in the browser — the API binds the refresh token to the device
 * fingerprint it sees on the issuing request, and a server-issued token
 * carries a `Node.js/...` fingerprint that the browser can never refresh.
 * The legacy server-only names stay as a fallback so an existing deployment
 * keeps rendering while its env is being updated.
 */
const PROJECT_URL = process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '';
const APP_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';

/**
 * Default OE locale. Mirrors `DEFAULT_LOCALE` in `./locale`, duplicated here to
 *  keep this module dependency-free (it is imported by literally every OE
 *  consumer, including `proxy.ts` transitively). Both are constants, so the two
 *  cannot drift apart at runtime the way two env reads could.
 */
const DEFAULT_LANG = 'en_US';

/**
 * `true` when both the project URL and the app token are configured. Every
 *  graceful-degradation path (mock catalog, empty CMS blocks) gates on it.
 */
export const isOneEntryEnabled = Boolean(PROJECT_URL && APP_TOKEN);

/**
 * localStorage key the SDK's `saveFunction` writes the rotated refresh token
 *  to. The hyphenated spelling is mandated by the MCP `tokens` rule.
 */
export const REFRESH_TOKEN_KEY = 'refresh-token';

/**
 * localStorage key holding the auth-provider marker that minted the current
 *  session. The SDK needs it to build the proactive `/refresh` URL.
 */
export const AUTH_PROVIDER_KEY = 'authProviderMarker';

/**
 * Passive callback the SDK invokes on every successful refresh-token
 * rotation. Never called on failure — clearing a dead token is the app's job
 * (see {@link clearTokens}).
 *
 * @param refreshToken - Freshly rotated refresh token.
 * @returns Resolves once the token is persisted.
 */
const saveFunction = async (refreshToken: string): Promise<void> => {
  if (!refreshToken || typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    /* private mode / quota — the session still works for this page load */
  }
};

/**
 * Build a fresh SDK instance. `defineOneEntry` validates its input
 * synchronously and throws a plain `Error` (not `IError`) on empty url/token,
 * so the caller must guard on {@link isOneEntryEnabled} first.
 *
 * @param  [config]              - Optional per-instance overrides.
 * @param  [config.langCode]     - OE locale code.
 * @param  [config.refreshToken] - Shopper refresh token to install.
 * @param  [config.guestId]      - `x-guest-id` for anonymous traffic.
 * @param  [config.deviceMetadata] - Browser fingerprint override.
 * @returns A configured SDK instance.
 */
function createInstance(
  config: {
    langCode?: string;
    refreshToken?: string;
    guestId?: string;
    deviceMetadata?: string;
  } = {},
): ReturnType<typeof defineOneEntry> {
  return defineOneEntry(PROJECT_URL, {
    langCode: config.langCode || DEFAULT_LANG,
    token: APP_TOKEN,
    ...(config.guestId ? { guestId: config.guestId } : {}),
    ...(config.deviceMetadata ? { deviceMetadata: config.deviceMetadata } : {}),
    auth: {
      ...(config.refreshToken ? { refreshToken: config.refreshToken } : {}),
      saveFunction,
    },
  });
}

/**
 * Mutable singleton. Swapped by {@link reDefine} when a browser session is
 *  restored from localStorage. `null` only when OE env vars are absent.
 */
let apiInstance = isOneEntryEnabled ? createInstance() : null;

/**
 * Current SDK language code. Kept alongside the instance so
 *  {@link getLang} works in Client Components without `useParams`.
 */
let currentLang = DEFAULT_LANG;

export type OneEntryClient = ReturnType<typeof defineOneEntry>;

/**
 * MCP-canonical accessor. Returns the current SDK instance and throws loudly
 * when the OE env vars are missing — a deploy-time misconfiguration surfaces
 * here instead of as an obscure "cannot read property of null" later.
 *
 * @returns The live SDK instance.
 * @see {@link https://oneentry.cloud/instructions/npm OneEntry CMS docs}
 */
export function getApi(): OneEntryClient {
  if (!apiInstance) {
    throw new Error('OneEntry SDK is not configured. Set NEXT_PUBLIC_ONEENTRY_URL and NEXT_PUBLIC_ONEENTRY_TOKEN.');
  }
  return apiInstance;
}

/**
 * Non-throwing variant of {@link getApi} for the storefront's
 * graceful-degradation paths (mock catalog, empty CMS blocks) that must keep
 * rendering when OE is not configured.
 *
 * @returns The live instance, or `null` when unconfigured.
 */
export function getApiSafe(): OneEntryClient | null {
  return apiInstance;
}

/**
 * Read-only instances pinned to one locale, one per language, created lazily.
 *
 * A few SDK endpoints take no `langCode` argument and answer in whatever
 * language their instance was built with — `Blocks.getSlides` is the one the
 * storefront depends on. The singleton is built with {@link DEFAULT_LANG} and
 * must not be re-pointed on the server (it is shared by every visitor, and on
 * the browser it also carries the shopper's session), so a second locale needs
 * its own handle rather than a mutation.
 *
 * These carry the app token only — never a refresh token — so they are safe to
 * share across requests the same way the app-token singleton is.
 */
const localeInstances = new Map<string, OneEntryClient>();

/**
 * SDK instance that answers in `lang`, for endpoints that cannot take a locale
 * argument. Returns the singleton for the default locale and for callers that
 * pass nothing, so nothing changes on a single-locale deployment.
 *
 * @param   [lang] - OE locale code, e.g. `de_DE`.
 * @returns          An instance pinned to that locale, or `null` when
 *                   unconfigured.
 */
export function getApiForLang(lang?: string): OneEntryClient | null {
  if (!isOneEntryEnabled) return null;
  if (!lang || lang === DEFAULT_LANG) return apiInstance;
  const existing = localeInstances.get(lang);
  if (existing) return existing;
  const created = createInstance({ langCode: lang });
  localeInstances.set(lang, created);
  return created;
}

/**
 * Re-create the singleton with the shopper's refresh token — the session
 * bootstrap step, called once from `AuthContext` on mount.
 *
 * `reDefine` does not itself refresh: it only places the token in state, and
 * the SDK proactively fetches an access token before the first user-auth
 * request. Guarded to the browser on purpose — on the server a single
 * instance serves every visitor, so installing one shopper's token there
 * would leak their `Authorization` header onto everybody else's requests.
 *
 * @param refreshToken - Refresh token read from localStorage.
 * @param [langCode]   - Locale for the new instance.
 * @returns Resolves once the instance is swapped.
 * @see {@link https://oneentry.cloud/instructions/npm OneEntry CMS docs}
 */
export async function reDefine(refreshToken: string, langCode?: string): Promise<void> {
  if (!refreshToken || !isOneEntryEnabled) {
    return;
  }
  if (typeof window === 'undefined') {
    throw new Error('reDefine() is browser-only — the server singleton is shared across visitors.');
  }
  currentLang = langCode || currentLang;
  apiInstance = createInstance({ langCode: currentLang, refreshToken });
}

/**
 * Create a throw-away SDK instance that never touches the shared singleton.
 *
 * Required whenever a server request must speak on behalf of one specific
 * visitor — `AuthProvider.oauth` stamping the browser's `deviceMetadata`, or
 * a guest-scoped call carrying `x-guest-id`. Mutating the singleton for
 * those (`setDeviceMetadata` / `setGuestId` / `auth()`) would apply to every
 * concurrent visitor on the same Node process.
 *
 * @param [config]                 - Per-request overrides.
 * @param [config.langCode]        - OE locale code.
 * @param [config.guestId]         - `x-guest-id` value.
 * @param [config.deviceMetadata]  - Browser fingerprint string.
 * @returns A fresh instance, or `null` when unconfigured.
 */
export function createRequestApi(
  config: {
    langCode?: string;
    guestId?: string;
    deviceMetadata?: string;
  } = {},
): OneEntryClient | null {
  if (!isOneEntryEnabled) return null;
  return createInstance(config);
}

/**
 * Whether the current instance already holds an access token. Checked before
 * {@link reDefine} so an active session is not needlessly re-created (which
 * would burn a `/refresh` round-trip).
 *
 * The SDK's `IDefineApi` has no top-level `.state` — the shared state object
 * is reachable only through a module (`AuthProvider`).
 *
 * @returns `true` when an access token is installed.
 */
export function hasActiveSession(): boolean {
  if (!apiInstance) return false;
  const provider = apiInstance.AuthProvider as unknown as {
    state?: { accessToken?: string };
  };
  return Boolean(provider?.state?.accessToken);
}

/**
 * Install both tokens on the current instance. Needed after `oauth()`, which
 * — unlike `auth()` — does not write them into state itself.
 *
 * @param accessToken  - Bearer token for user-auth requests.
 * @param refreshToken - Rotating refresh token.
 */
export function syncTokens(accessToken: string, refreshToken: string): void {
  if (!apiInstance) return;
  apiInstance.AuthProvider.setAccessToken(accessToken);
  apiInstance.AuthProvider.setRefreshToken(refreshToken);
}

/**
 * Drop the persisted session. The SDK never clears storage on a failed
 * refresh, so without this a dead token replays `POST /refresh 400` on every
 * page load. Also resets the singleton back to app-token-only.
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROVIDER_KEY);
  } catch {
    /* private mode / quota — the in-memory reset below still applies */
  }
  if (isOneEntryEnabled) {
    apiInstance = createInstance({ langCode: currentLang });
  }
}

/**
 * Whether this browser holds a shopper session — i.e. a refresh token that
 * {@link reDefine} has installed (or is about to). This is the client-side
 * replacement for "is the auth cookie present?": user-scoped calls short-
 * circuit on it instead of firing a guaranteed-401 request.
 *
 * Always `false` on the server, where no visitor session exists.
 *
 * @returns `true` when a session can be resumed or is already live.
 */
export function hasStoredSession(): boolean {
  if (hasActiveSession()) return true;
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
  } catch {
    return false;
  }
}

/**
 * Persist the shopper's refresh token + provider marker and install both
 * tokens on the live instance. `auth()` already does the state part itself,
 * but `oauth()` does not — so the OAuth callback must call this explicitly.
 *
 * @param entity                - Auth entity returned by OE.
 * @param entity.accessToken    - Bearer token.
 * @param entity.refreshToken   - Rotating refresh token.
 * @param providerMarker        - Marker that minted the session.
 */
export function storeSession(entity: { accessToken?: string; refreshToken?: string }, providerMarker: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (entity.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, entity.refreshToken);
    }
    localStorage.setItem(AUTH_PROVIDER_KEY, providerMarker);
  } catch {
    /* private mode / quota — the in-memory session below still works */
  }
  if (entity.accessToken && entity.refreshToken) {
    syncTokens(entity.accessToken, entity.refreshToken);
  }
}

/**
 * Provider marker that minted the current session (`'email'`, `'google'`, …).
 * `AuthProvider.refresh` / `.logout` must be called with the same marker that
 * issued the token, otherwise OE rejects the call.
 *
 * @returns The stored marker, defaulting to `'email'`.
 */
export function getAuthProviderMarker(): string {
  if (typeof window === 'undefined') return 'email';
  try {
    return localStorage.getItem(AUTH_PROVIDER_KEY) || 'email';
  } catch {
    return 'email';
  }
}

/**
 * Current SDK language code — for Client Components that need the locale
 * without threading `params` through the tree.
 *
 * @returns Active OE locale code (e.g. `"en_US"`).
 */
export function getLang(): string {
  return currentLang;
}

/**
 * One entry of an OE `image` / `file` / `groupOfImages` attribute value.
 *
 * `previewLink` has two shapes on the wire, and which one you get depends on
 * whether the file was uploaded through a preview template:
 *
 * - **legacy** — a plain string URL to a recompressed copy of the original. Same
 *   pixel dimensions, roughly half the bytes; useless as a placeholder.
 * - **preview-template** — an object keyed by preview level,
 *   `{ [level]: [blurDataUri, previewUrl] }`, where the first entry of the pair
 *   is a ~130-character base64 WebP LQIP. `defaultPreview` names the level to
 *   read, and the tenant currently ships `default` (20×20) plus `thumb`.
 *
 * Reading the object shape into an `<img src>` stringifies it to
 * `"[object Object]"` and 404s, so every consumer must go through
 * {@link getImage}.
 */
type OeFileValue = {
  downloadLink?: unknown;
  previewLink?: unknown;
  defaultPreview?: unknown;
};

/**
 * A CMS image reduced to what the renderer needs: where to fetch it, and the
 * inline placeholder to paint until it arrives.
 *
 * url - Absolute URL of the full-size image.
 *
 * [blur] - Base64 data URI for `next/image`'s `blurDataURL`.
 */
export type OeImage = {
  url: string;
  blur?: string;
};

/**
 * Pull the LQIP data URI out of a file record, when the upload went through a
 * preview template.
 *
 * The pair is `[blurDataUri, previewUrl]`; only the first entry is inlineable.
 * `defaultPreview` picks the level, falling back to `default` — and then to
 * whichever level exists, so a tenant that renames its levels still gets a
 * placeholder instead of silently losing one.
 *
 * @param file - A single OE file record.
 * @returns Base64 data URI, or `undefined` when absent.
 */
function fileBlur(file: OeFileValue): string | undefined {
  const preview = file.previewLink;
  if (!preview || typeof preview !== 'object') return undefined;

  const levels = preview as Record<string, unknown>;
  const named = typeof file.defaultPreview === 'string' ? file.defaultPreview : 'default';
  const pair = levels[named] ?? levels.default ?? Object.values(levels)[0];
  if (!Array.isArray(pair)) return undefined;

  const [blur] = pair;
  return typeof blur === 'string' && blur.startsWith('data:') ? blur : undefined;
}

/**
 * Normalize any OE image-ish attribute value into a single URL.
 *
 * The wire shape depends **only on the number of uploaded files**: one file
 * arrives as a bare object, two or more as an array (SDK ≥ 1.0.157) — and
 * `groupOfImages` is always an array. Accepting both is what keeps a banner
 * from silently disappearing the moment a content manager deletes the second
 * picture. The attribute wrapper (`{ value: … }`) is unwrapped too, so both
 * `getImageUrl(attrs.photo)` and `getImageUrl(attrs.photo?.value)` work.
 *
 * `previewLink` is the documented fallback for records that ship only a
 * preview (OE order products, some form-data records).
 *
 * @param value - Attribute, attribute value, array or bare object.
 * @returns An absolute URL, or `''` when there is no usable image.
 */
export function getImageUrl(value: unknown): string {
  return getImage(value).url;
}

/**
 * Strip the `{ value: … }` attribute envelope, so callers may pass either the
 * attribute or its value.
 *
 * @param value - Attribute or attribute value.
 * @returns The unwrapped value.
 */
function unwrapAttr(value: unknown): unknown {
  return !Array.isArray(value) && typeof value === 'object' && value !== null && 'value' in value
    ? (value as { value: unknown }).value
    : value;
}

/**
 * Normalize any OE image-ish attribute value into a URL plus its inline blur
 * placeholder.
 *
 * Same shape tolerance as {@link getImageUrl} — one uploaded file arrives as a
 * bare object, two or more as an array. The blur is only present for files
 * uploaded through a preview template; callers must treat it as optional and
 * fall back to `placeholder="empty"`.
 *
 * @param value - Attribute, attribute value, array or bare object.
 * @returns URL (`''` when there is no usable image) and optional blur.
 */
export function getImage(value: unknown): OeImage {
  if (!value) return { url: '' };
  if (typeof value === 'string') return { url: value };

  const unwrapped = unwrapAttr(value);
  if (!unwrapped) return { url: '' };

  const first = Array.isArray(unwrapped) ? unwrapped[0] : unwrapped;
  if (!first || typeof first !== 'object') return { url: '' };

  const file = first as OeFileValue;
  const blur = fileBlur(file);

  if (typeof file.downloadLink === 'string' && file.downloadLink) {
    return { url: file.downloadLink, blur };
  }
  // Only the legacy string shape is a usable `src`; the preview-template object
  // would stringify to "[object Object]".
  return { url: typeof file.previewLink === 'string' ? file.previewLink : '', blur };
}

/**
 * Every image of an OE attribute, in wire order, each with its blur.
 *
 * The gallery counterpart of {@link getImage}; entries without a usable URL are
 * dropped, exactly as {@link getImageUrls} does.
 *
 * @param value - Attribute, attribute value, array or bare object.
 * @returns Non-empty images, possibly an empty array.
 */
export function getImages(value: unknown): OeImage[] {
  if (!value) return [];

  const unwrapped = unwrapAttr(value);
  if (!unwrapped) return [];

  const list = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
  return list.map((item) => getImage(item)).filter((img) => img.url.length > 0);
}

/**
 * Index a gallery's blurs by image URL.
 *
 * Keyed by URL rather than by position on purpose: the adapters slice the image
 * list several ways (`colorImages`, `galleryImages`, per-variant previews), and
 * a parallel blur array would have to be sliced in lockstep every time — one
 * missed slice and every card shows the wrong placeholder. A map survives any
 * reshuffling, and it serializes to the client as plain JSON.
 *
 * @param images - Images from {@link getImages}.
 * @returns URL → blur data URI, omitting images without one.
 */
export function blurByUrl(images: OeImage[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const img of images) {
    if (img.blur) map[img.url] = img.blur;
  }
  return map;
}

/**
 * Every URL of an OE image attribute, in wire order — for galleries and
 * `groupOfImages`. Same one-file-is-an-object tolerance as
 * {@link getImageUrl}; entries without a usable link are dropped.
 *
 * @param value - Attribute, attribute value, array or bare object.
 * @returns Non-empty URLs, possibly an empty array.
 */
export function getImageUrls(value: unknown): string[] {
  return getImages(value).map((img) => img.url);
}

/**
 * Alias for the SDK's `IError`. Re-exported so app code can `import { OeError }
 * from '@/lib/oneentry'` without reaching into `oneentry/dist/base/utils`.
 */
export type OeError = IError;

/**
 * Type-guard for the SDK's `IError`. Narrows to `IError` on true — and,
 * critically, narrows the sibling union arm (`IAuthEntity`, `IProductEntity`,
 * …) on false, so callers can `if (isError(r)) return; r.accessToken`.
 *
 * @param value - Any SDK return value.
 * @returns `true` when the value is an OE error envelope.
 */
export function isError<T>(value: T | IError): value is IError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof (value as { statusCode: unknown }).statusCode === 'number'
  );
}
