import { defineOneEntry } from 'oneentry';
import type { IError } from 'oneentry/dist/base/utils';

/** Canonical OneEntry SDK entry point (MCP `sdk-init` / `tokens` rules). */
const PROJECT_URL = process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '';
const APP_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';

/** Origin that serves CMS media (`/cloud-static/...`). */
export const CMS_MEDIA_ORIGIN = (() => {
  try {
    return PROJECT_URL ? new URL(PROJECT_URL).origin : '';
  } catch {
    return '';
  }
})();

/** Default OE locale. */
const DEFAULT_LANG = 'en_US';

/** `true` when both the project URL and the app token are configured. */
export const isOneEntryEnabled = Boolean(PROJECT_URL && APP_TOKEN);

/** localStorage key the SDK's `saveFunction` writes the rotated refresh token to. */
export const REFRESH_TOKEN_KEY = 'refresh-token';

/** localStorage key holding the auth-provider marker that minted the current session. */
export const AUTH_PROVIDER_KEY = 'authProviderMarker';

/** Passive callback the SDK invokes on every successful refresh-token rotation. */
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

/** Build a fresh SDK instance. */
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

/** Mutable singleton. */
let apiInstance = isOneEntryEnabled ? createInstance() : null;

/** Current SDK language code. */
let currentLang = DEFAULT_LANG;

export type OneEntryClient = ReturnType<typeof defineOneEntry>;

/** MCP-canonical accessor. */
export function getApi(): OneEntryClient {
  if (!apiInstance) {
    throw new Error('OneEntry SDK is not configured. Set NEXT_PUBLIC_ONEENTRY_URL and NEXT_PUBLIC_ONEENTRY_TOKEN.');
  }
  return apiInstance;
}

/** Non-throwing variant of {@link getApi} for the storefront's graceful-degradation paths (mock catalog, empty CMS blocks) that must keep rendering when OE is not configured. */
export function getApiSafe(): OneEntryClient | null {
  return apiInstance;
}

/** Read-only instances pinned to one locale, one per language, created lazily. */
const localeInstances = new Map<string, OneEntryClient>();

/** SDK instance that answers in `lang`, for endpoints that cannot take a locale argument. */
export function getApiForLang(lang?: string): OneEntryClient | null {
  if (!isOneEntryEnabled) return null;
  if (!lang || lang === DEFAULT_LANG) return apiInstance;
  const existing = localeInstances.get(lang);
  if (existing) return existing;
  const created = createInstance({ langCode: lang });
  localeInstances.set(lang, created);
  return created;
}

/** Re-create the singleton with the shopper's refresh token. Browser-only: the server singleton is shared, so a token installed there would leak onto other visitors' requests. */
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

/** Create a throw-away SDK instance that never touches the shared singleton. */
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

/** Whether the current instance already holds an access token. */
export function hasActiveSession(): boolean {
  if (!apiInstance) return false;
  const provider = apiInstance.AuthProvider as unknown as {
    state?: { accessToken?: string };
  };
  return Boolean(provider?.state?.accessToken);
}

/** Install both tokens on the current instance. */
export function syncTokens(accessToken: string, refreshToken: string): void {
  if (!apiInstance) return;
  apiInstance.AuthProvider.setAccessToken(accessToken);
  apiInstance.AuthProvider.setRefreshToken(refreshToken);
}

/** Drop the persisted session. */
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

/** Whether this browser holds a shopper session — i.e. a refresh token that {@link reDefine} has installed. */
export function hasStoredSession(): boolean {
  if (hasActiveSession()) return true;
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
  } catch {
    return false;
  }
}

/** Persist the shopper's refresh token + provider marker and install both tokens on the live instance. */
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

/** Provider marker that minted the current session (`'email'`, `'google'`, …). */
export function getAuthProviderMarker(): string {
  if (typeof window === 'undefined') return 'email';
  try {
    return localStorage.getItem(AUTH_PROVIDER_KEY) || 'email';
  } catch {
    return 'email';
  }
}

/** Current SDK language code. */
export function getLang(): string {
  return currentLang;
}

/** Point the browser's shopper-scoped calls at a locale. */
export function setLang(lang: string): void {
  if (typeof window === 'undefined' || !lang) return;
  currentLang = lang;
}

/** One entry of an OE `image` / `file` / `groupOfImages` attribute value. */
type OeFileValue = {
  downloadLink?: unknown;
  previewLink?: unknown;
  defaultPreview?: unknown;
};

/** A CMS image reduced to what the renderer needs: where to fetch it, and the inline placeholder to paint until it arrives. */
export type OeImage = {
  url: string;
  blur?: string;
};

/** Pull the LQIP data URI out of a file record, when the upload went through a preview template. */
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

/** Normalize any OE image-ish attribute value into a single URL. */
export function getImageUrl(value: unknown): string {
  return getImage(value).url;
}

/** Strip the `{ value: … }` attribute envelope, so callers may pass either the attribute or its value. */
function unwrapAttr(value: unknown): unknown {
  return !Array.isArray(value) && typeof value === 'object' && value !== null && 'value' in value
    ? (value as { value: unknown }).value
    : value;
}

/** Normalize any OE image-ish attribute value into a URL plus its inline blur placeholder. */
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
  // Only the legacy string shape is a usable `src`; the preview-template object would stringify to "[object Object]".
  return { url: typeof file.previewLink === 'string' ? file.previewLink : '', blur };
}

/** Every image of an OE attribute, in wire order, each with its blur. */
export function getImages(value: unknown): OeImage[] {
  if (!value) return [];

  const unwrapped = unwrapAttr(value);
  if (!unwrapped) return [];

  const list = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
  return list.map((item) => getImage(item)).filter((img) => img.url.length > 0);
}

/** Index a gallery's blurs by image URL. */
export function blurByUrl(images: OeImage[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const img of images) {
    if (img.blur) map[img.url] = img.blur;
  }
  return map;
}

/** Every URL of an OE image attribute, in wire order. */
export function getImageUrls(value: unknown): string[] {
  return getImages(value).map((img) => img.url);
}

/** Alias for the SDK's `IError`. Re-exported so app code can `import { OeError } from '@/lib/oneentry'` without reaching into `oneentry/dist/base/utils`. */
export type OeError = IError;

/** Type-guard for the SDK's `IError`. Narrows to `IError` on true. */
export function isError<T>(value: T | IError): value is IError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof (value as { statusCode: unknown }).statusCode === 'number'
  );
}
