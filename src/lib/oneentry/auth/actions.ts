'use server';
import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { oneentry, isOneEntryEnabled, isError, getUserApi, getGuestApi } from '../index';
import { loadProductsByIds } from '../catalog/products';
import { DEFAULT_LOCALE } from '../locale';
import { pickImage, type RawPicture } from './pick-image';
import {
  AUTH_MARKER,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  IDENTIFIER_COOKIE,
  type CookieJar,
  type OeAuthEntity,
  setSessionCookies,
  clearSessionCookies,
  readAccessOrRefresh,
} from './session';

const SIGNUP_FORM_IDENTIFIER = 'signin';

export interface AuthSuccess {
  ok: true;
  userIdentifier: string;
  user: OeUser | null;
}
export interface AuthFailure {
  ok: false;
  error: string;
}
export type AuthResult = AuthSuccess | AuthFailure;

export interface OeAddress {
  /** Local UI id; numeric form-data record id once persisted to OE. */
  id: string;
  /** Form-data record id in OE — present after the address is saved. */
  recordId?: number;
  name: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  instructions?: string;
  /** Formatted display string assembled on save. */
  full: string;
}

const USER_ADDRESSES_MODULE_CONFIG_ID = 24;
const USER_DATA_MODULE_CONFIG_ID = 3;
const SUBSCRIPTION_MGMT_MODULE_CONFIG_ID = 32;

export interface OeSubscriptions {
  emailNewsletter: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  newArrivals: boolean;
  saleAlerts: boolean;
  loyaltyUpdates: boolean;
}

export interface OeConsent {
  dataProcessing: boolean;
  crossBorder: boolean;
}

export interface OeCartItem {
  productId: number;
  qty: number;
  addedAt?: string;
}
export interface OeWishlistItem {
  productId: number;
  addedAt?: string;
}

export interface OeOrderProduct {
  id: number;
  title: string;
  quantity: number;
  price: number;
  sku: string | null;
  image: string;
}

export interface OeOrder {
  id: number;
  storage: string;
  statusIdentifier: string;
  /** Human-readable status title from OE `statusLocalizeInfos.title`
   *  (admin-panel display name — e.g. "In Progress", "Shipped"). Prefer
   *  this over `statusIdentifier` when rendering. */
  statusTitle: string;
  totalSum: string;
  currency: string;
  createdDate?: string;
  products: OeOrderProduct[];
  formData: Record<string, unknown>;
}

export interface OeUserState {
  /** Recently viewed product IDs with timestamps — order: index 0 is most
   *  recent. Stored on the user record so the trail follows the account
   *  across devices. Bounded to ~100 entries on write. */
  recentlyViewed?: Array<{ productId: number; viewedAt: string }>;
}

export interface OeRecentlyViewedItem {
  productId: number;
  /** ISO timestamp */
  viewedAt: string;
}

export interface OeUser {
  id: number;
  identifier: string;
  firstName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  /** raw signin formData (marker → value) */
  formData: Record<string, unknown>;
  /** subscriptions assembled from signin formData (email/sms) + subscription_management form record */
  subscriptions: OeSubscriptions;
  /** addresses from the `user_addresses` form records */
  addresses: OeAddress[];
  /** consent from the `user_data` form record */
  consent: OeConsent;
  /** extra profile fields from the `user_data` form record */
  lastName?: string;
  dob?: string;
  shoeSize?: string;
  clothingSize?: string;
  /** cart items (productId + qty); details to be loaded from catalog separately */
  cart: OeCartItem[];
  /** wishlist productIds */
  wishlist: OeWishlistItem[];
  /** Recently viewed product IDs, ordered most-recent-first. */
  recentlyViewed: OeRecentlyViewedItem[];
  /** orders from all user storages */
  orders: OeOrder[];
  /** loyalty state resolved from OE `Discounts` on `/me` bootstrap. `null`
   *  when nothing is configured for this tenant (or the user isn't in any
   *  discount user-group yet). */
  loyalty: OeLoyalty | null;
}

/** One rung of the OE loyalty ladder — `getDiscountByMarker(marker)` returns
 *  the config regardless of the user's group membership, so we pass the raw
 *  set to the client and let it pick the highest tier the shopper actually
 *  qualifies for (based on LTV). */
export interface OeLoyaltyTier {
  tier: string;
  tierTitle: string;
  discountPct: number;
  discountMaxAmount: number | null;
  applicability: string;
  /** LTV threshold to qualify (from `conditions[type=USER_LTV].value.amount`).
   *  `null` when the tier isn't gated by LTV — treat as always-available. */
  ltvThreshold: number | null;
  /** Cart-total threshold from `conditions[type=MIN_CART_AMOUNT].value.amount`.
   *  Some tenants ladder personal-discount rungs by cart size (silver at $500,
   *  gold at $1000, …) instead of user lifetime value. `null` when the tier
   *  has no such gate. Consumed by `previewOrderAction`'s fallback so the
   *  shopper actually gets the discount at cart time. */
  minCartAmount: number | null;
  /** OE user-group ids the tier belongs to (`userGroups[].id`). Reserved for
   *  a future group-based selector; today we still pick by LTV. */
  userGroupIds: number[];
}

export interface OeLoyalty {
  /** All tier configs OE knows about (sorted ascending by LTV threshold).
   *  Client mergeOeUser picks the highest tier where `user.LTV ≥ ltvThreshold`. */
  tiers: OeLoyaltyTier[];
  /** Aggregate bonus balance across all bonus types. */
  bonusBalance: number;
}

// Cookie constants + `CookieJar` / `OeAuthEntity` types + session-cookie
// helpers live in `./session.ts` — this file re-imports them at the top.
// Kept here originally as private helpers; extracted so mutation-side
// actions in other `'use server'` files can share `readAccessOrRefresh`
// without duplicating the refresh logic. See `session.ts` for the
// "why not a `'use server'` re-export" rationale.

const DEFAULT_SUBSCRIPTIONS: OeSubscriptions = {
  emailNewsletter: false,
  smsNotifications: false,
  pushNotifications: false,
  orderUpdates: false,
  newArrivals: false,
  saleAlerts: false,
  loyaltyUpdates: false,
};
const DEFAULT_CONSENT: OeConsent = { dataProcessing: false, crossBorder: false };

// User-scoped order storages (non-guest). Probed via Orders.getAllOrdersStorage.
const USER_ORDER_STORAGE_MARKERS = ['home', 'store_pickup', 'locker'] as const;

async function fetchUserOrders(accessToken: string): Promise<OeOrder[]> {
  const api = getUserApi(accessToken);
  if (!api) return [];
  type RawProduct = {
    id?: number;
    title?: string;
    quantity?: number;
    price?: number;
    sku?: string | null;
    previewImage?: RawPicture | RawPicture[] | null;
  };
  type RawOrder = {
    id?: number;
    statusIdentifier?: string;
    /** OE ships the status display name per-locale here. Payload shape can
     *  be either a flat `{ title }` (already-localised) or the wrapped
     *  `{ en_US: { title } }` variant — the extractor below handles both. */
    statusLocalizeInfos?: { title?: string } | Record<string, { title?: string }>;
    totalSum?: string;
    currency?: string;
    createdDate?: string;
    products?: RawProduct[];
    formData?: Array<{ marker?: string; value?: unknown }>;
  };
  const all: OeOrder[] = [];
  await Promise.all(
    USER_ORDER_STORAGE_MARKERS.map(async (marker) => {
      try {
        const result = await api.Orders.getAllOrdersByMarker(marker, 'en_US', 0, 100);
        if (isError(result)) return;
        // SDK's `IOrderByMarkerEntity` types are stricter than what actually
        // ships (e.g. `previewImage` may be a bare `{ downloadLink }` object
        // even though the SDK types it as `IPicture` with mandatory
        // `filename`/`size` fields). Cast to the local RawOrder shape.
        const data = result as unknown as { items?: RawOrder[]; total?: number };
        for (const o of data.items ?? []) {
          const formDataMap: Record<string, unknown> = {};
          for (const f of o.formData ?? []) {
            if (f.marker) formDataMap[f.marker] = f.value;
          }
          // Extract status title from either shape OE ships:
          //   flat: `{ title: "In Progress" }`
          //   wrapped: `{ en_US: { title: "In Progress" } }`
          const sli = o.statusLocalizeInfos;
          const flatTitle = sli && typeof (sli as { title?: unknown }).title === 'string'
            ? (sli as { title: string }).title
            : '';
          const wrappedTitle = sli && !flatTitle
            ? String(((sli as Record<string, { title?: unknown }>)['en_US']?.title
                ?? Object.values(sli as Record<string, { title?: unknown }>)[0]?.title
                ?? '') || '')
            : '';
          all.push({
            id: o.id ?? 0,
            storage: marker,
            statusIdentifier: o.statusIdentifier ?? '',
            statusTitle: flatTitle || wrappedTitle,
            totalSum: o.totalSum ?? '0',
            currency: o.currency ?? 'USD',
            createdDate: o.createdDate,
            products: (o.products ?? []).map((p) => ({
              id: p.id ?? 0,
              title: p.title ?? '',
              quantity: p.quantity ?? 1,
              price: p.price ?? 0,
              sku: p.sku ?? null,
              image: pickImage(p.previewImage),
            })),
            formData: formDataMap,
          });
        }
      } catch {
        /* swallow — empty list for this storage */
      }
    }),
  );
  // newest first
  all.sort((a, b) => (b.createdDate ?? '').localeCompare(a.createdDate ?? ''));

  // OE frequently returns `previewImage: null` for products embedded in an
  // order (the snapshot doesn't inline the picture entity). Fall back to the
  // catalog preview so My Orders / Purchase History render real thumbnails.
  const missingIds = new Set<number>();
  for (const o of all) {
    for (const p of o.products) {
      if (!p.image && p.id > 0) missingIds.add(p.id);
    }
  }
  if (missingIds.size > 0) {
    const catalog = await loadProductsByIds(Array.from(missingIds));
    const imageMap = new Map<number, string>();
    for (const c of catalog) {
      if (c.preview) imageMap.set(c.id, c.preview);
    }
    if (imageMap.size > 0) {
      for (const o of all) {
        for (const p of o.products) {
          if (!p.image) {
            const fallback = imageMap.get(p.id);
            if (fallback) p.image = fallback;
          }
        }
      }
    }
  }
  return all;
}


/** Resolve the current tier + bonus balance for the authenticated user.
 *  Tier is a marker guess (`bronze` → `silver` → …) — walked in order and
 *  the first non-404 hit wins. Returns `null` when none of the markers
 *  resolve or the tenant has no discounts configured. */
/** Loyalty tier markers configured on this OE tenant, in ascending order
 *  of "prestige". Shared by `fetchLoyalty` (to fan-out the tier fetch), and
 *  by `previewOrderAction` / `createOrderAction` (as
 *  `additionalDiscountsMarkers` so OE has a chance to apply the shopper's
 *  personal discount at cart time). Change this in ONE place if the
 *  merchant renames a rung.
 *  Not exported — Next.js 16 `use server` files must only export async
 *  functions. Module-scoped is enough for the three intra-file callers. */
const TIER_MARKERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

async function fetchLoyalty(accessToken: string): Promise<OeLoyalty | null> {
  const api = getUserApi(accessToken);
  if (!api) return null;


  // Fetch every tier in parallel via SDK `Discounts.getDiscountByMarker` and
  // the bonus balance via `Discounts.getBonusBalance`. The SDK normalises
  // localizeInfos + fields for us, so downstream code sees a clean shape.
  const [rawTiers, bonusResult] = await Promise.all([
    Promise.all(TIER_MARKERS.map((m) => api.Discounts.getDiscountByMarker(m, 'en_US'))),
    api.Discounts.getBonusBalance(),
  ]);

  // SDK typings claim `IDiscountCondition.value` is a string, but the real
  // API returns `{ amount: 100 }` for USER_LTV — cast to a local shape so
  // downstream code stays honest about what's actually there.
  type RawDiscount = {
    identifier?: string;
    localizeInfos?: { en_US?: { title?: string }; title?: string } & Record<string, { title?: string }>;
    discountValue?: { value?: number; maxAmount?: number | null; discountType?: string; applicability?: string };
    conditions?: Array<{ conditionType?: string; type?: string; value?: { amount?: number } | string }>;
    userGroups?: Array<{ id?: number }> | Record<string, unknown> | null;
  };

  const tiers: OeLoyaltyTier[] = rawTiers
    .filter((r) => !isError(r))
    .map((r) => r as unknown as RawDiscount)
    .filter((r) => !!r.identifier)
    .map((r): OeLoyaltyTier => {
      const dv = r.discountValue ?? {};
      const isPercent = (dv.discountType ?? '').toUpperCase() === 'PERCENTAGE'
        || (dv.discountType ?? '').toUpperCase() === 'PERCENT';
      const readAmount = (cond: { value?: unknown } | undefined): number | null => {
        if (!cond) return null;
        if (typeof cond.value === 'object' && cond.value !== null) {
          const a = (cond.value as { amount?: number }).amount;
          return typeof a === 'number' && Number.isFinite(a) ? a : null;
        }
        if (typeof cond.value === 'string' || typeof cond.value === 'number') {
          const n = Number(cond.value);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      };
      const ltvCond = (r.conditions ?? []).find(
        (c) => c.conditionType === 'USER_LTV' || c.type === 'USER_LTV',
      );
      const minCartCond = (r.conditions ?? []).find(
        (c) => c.conditionType === 'MIN_CART_AMOUNT' || c.type === 'MIN_CART_AMOUNT',
      );
      const ltvValue = readAmount(ltvCond);
      const minCartValue = readAmount(minCartCond);
      const groupsRaw = Array.isArray(r.userGroups) ? r.userGroups : [];
      return {
        tier: r.identifier ?? '',
        tierTitle: r.localizeInfos?.en_US?.title ?? r.localizeInfos?.title ?? '',
        discountPct: isPercent ? Number(dv.value ?? 0) : 0,
        discountMaxAmount: dv.maxAmount ?? null,
        applicability: dv.applicability ?? '',
        ltvThreshold: ltvValue,
        minCartAmount: minCartValue,
        userGroupIds: groupsRaw.map((g) => Number(g?.id ?? 0)).filter((n) => n > 0),
      };
    })
    // Sort by ascending "effective threshold" so higher rungs land later.
    // Prefer LTV when set, else fall back to the cart-amount gate, else
    // `-1` (always-available tiers sit at the bottom of the ladder).
    .sort((a, b) => {
      const at = a.ltvThreshold ?? a.minCartAmount ?? -1;
      const bt = b.ltvThreshold ?? b.minCartAmount ?? -1;
      return at - bt;
    });

  // SDK returns bonus balance as either `{ balance }` or `[{ balance }, ...]`
  // depending on how the tenant sliced things. Sum whatever comes back.
  let balance = 0;
  if (!isError(bonusResult)) {
    const raw = bonusResult as unknown as { balance?: number | string } | Array<{ balance?: number | string }>;
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    balance = list.reduce((sum, b) => sum + Number(b?.balance ?? 0), 0);
  }

  // Return the object even when `tiers` is empty — a tenant may have a
  // configured bonus programme without any personal-discount rungs, and
  // dropping the balance here would hide it from the storefront (bonus
  // input on PaymentPage would render `0 available` forever).
  return {
    tiers,
    bonusBalance: Number.isFinite(balance) ? balance : 0,
  };
}

async function fetchMe(accessToken: string): Promise<OeUser | null> {
  type RawMe = {
    id?: number;
    identifier?: string;
    formData?: Array<{ marker?: string; value?: unknown }> | Record<string, Array<{ marker?: string; value?: unknown }>>;
    state?: OeUserState;
  };
  type RawCart = { items?: OeCartItem[]; total?: number };
  type RawWishlist = { items?: OeWishlistItem[]; total?: number };

  const api = getUserApi(accessToken);
  if (!api) return null;

  const [meResult, cartResult, wishlistResult, addrRecords, userDataRec, subsRec, orders, loyalty] = await Promise.all([
    api.Users.getUser('en_US'),
    api.Users.getCart(),
    api.Users.getWishlist(),
    fetchUserAddresses(accessToken),
    fetchUserDataRecord(accessToken),
    fetchSubsRecord(accessToken),
    fetchUserOrders(accessToken),
    fetchLoyalty(accessToken),
  ]);
  if (isError(meResult)) return null;
  // SDK `IUserEntity.formData` is strictly `FormDataType[]` but OE's raw
  // /me response may ship either a flat array or `{ en_US: [...] }`
  // depending on locale slicing — cast to the local RawMe shape that
  // handles both.
  const data = meResult as unknown as RawMe;
  const cart = isError(cartResult) ? null : (cartResult as unknown as RawCart);
  const wishlist = isError(wishlistResult) ? null : (wishlistResult as unknown as RawWishlist);

  // formData may be flat array or { lang: array }
  const arr = Array.isArray(data.formData)
    ? data.formData
    : data.formData?.en_US ?? [];
  const formDataMap: Record<string, unknown> = {};
  for (const item of arr) {
    if (item?.marker) formDataMap[item.marker] = item.value;
  }
  const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
  const asGender = (v: unknown): string | undefined => {
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return asString(v);
  };
  const radioBool = (v: unknown): boolean => v === 'true' || v === true;

  const state: OeUserState = data.state ?? {};
  // Subscriptions come exclusively from the `subscription_management` form
  // (email/sms) and the sign-in formData for the two boolean flags — no more
  // `state.subscriptionsExtra` fallback.
  const fromForm = subsRec.extras;
  const subscriptions: OeSubscriptions = {
    emailNewsletter: fromForm.emailNewsletter ?? radioBool(formDataMap['users_subscribe_to_promotional_email']),
    smsNotifications: fromForm.smsNotifications ?? radioBool(formDataMap['users_subscribe_to_promotional_sms']),
    pushNotifications: fromForm.pushNotifications ?? false,
    orderUpdates: fromForm.orderUpdates ?? false,
    newArrivals: fromForm.newArrivals ?? false,
    saleAlerts: fromForm.saleAlerts ?? false,
    loyaltyUpdates: fromForm.loyaltyUpdates ?? false,
  };

  // Profile extras + consent come exclusively from the `user_data` form
  // record — no more `state.profile` / `state.consent` fallback.
  const userExtras = userDataRec.extras;
  const consent: OeConsent = {
    dataProcessing: userExtras.consentDataProcessing ?? false,
    crossBorder: userExtras.consentCrossBorder ?? false,
  };

  return {
    id: data.id ?? 0,
    identifier: data.identifier ?? '',
    firstName: asString(formDataMap['first_name']),
    email: asString(formDataMap['email']) ?? data.identifier,
    phone: asString(formDataMap['phone']),
    gender: asGender(formDataMap['gender']),
    formData: formDataMap,
    lastName: userExtras.lastName,
    dob: userExtras.dob,
    shoeSize: userExtras.shoeSize,
    clothingSize: userExtras.clothingSize,
    // Addresses come exclusively from the `user_addresses` form records now.
    addresses: addrRecords,
    subscriptions,
    consent,
    cart: cart?.items ?? [],
    wishlist: wishlist?.items ?? [],
    recentlyViewed: Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [],
    orders,
    loyalty,
  };
}

async function readAccessFromCookies(): Promise<string | null> {
  const jar = (await cookies()) as unknown as CookieJar;
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

async function readStateFromMe(accessToken: string): Promise<OeUserState> {
  const api = getUserApi(accessToken);
  if (!api) return {};
  const result = await api.Users.getUser('en_US');
  if (isError(result)) return {};
  // SDK `IUserEntity.state` is `Record<string, unknown>`; our narrower
  // OeUserState is structurally compatible for the read path.
  const raw = result as unknown as { state?: OeUserState };
  return raw.state ?? {};
}

// ── Form-data helpers (SDK-backed under user accessToken) ────────────────────

/** SDK-backed GET-list for a form marker. Uses `FormData.getFormsDataByMarker`
 *  which the SDK exposes; body carries the extra filter (`userIdentifier`,
 *  `entityIdentifier`, ...) OE expects. */
async function formDataGetByMarker(
  accessToken: string,
  marker: string,
  formModuleConfigId: number,
  body: object,
  limit = 100,
): Promise<{ items?: RawFormRecord[]; total?: number } | null> {
  const api = getUserApi(accessToken);
  if (!api) return null;
  try {
    const result = await api.FormData.getFormsDataByMarker(
      marker,
      formModuleConfigId,
      body,
      0,
      DEFAULT_LOCALE,
      0,
      limit,
    );
    if (isError(result)) return null;
    // SDK typing narrows formData; the raw response tolerates both wrapped
    // and flat variants and our RawFormRecord shape reflects that.
    return result as unknown as { items?: RawFormRecord[]; total?: number };
  } catch {
    return null;
  }
}

interface FdSuccess<T> { ok: true; data: T }
interface FdError { ok: false; status: number; message: string }

/** SDK-backed POST of a new form-data record. */
async function formDataPost<T>(
  accessToken: string,
  body: {
    formIdentifier: string;
    formModuleConfigId: number;
    moduleEntityIdentifier: string;
    replayTo: string | null;
    status: string;
    formData: unknown;
  },
): Promise<FdSuccess<T> | FdError> {
  const api = getUserApi(accessToken);
  if (!api) return { ok: false, status: 0, message: 'OneEntry SDK not initialised' };
  try {
    // SDK's postFormsData internally wraps `formData` in { [langCode]: [...] }
    // if given a flat array. But some of our callers already pass the wrapped
    // shape `{ en_US: [...] }`. Unwrap in that case so the SDK does the wrap
    // correctly.
    const raw = body.formData;
    const flat = (
      raw
      && !Array.isArray(raw)
      && typeof raw === 'object'
      && 'en_US' in (raw as Record<string, unknown>)
    )
      ? (raw as Record<string, unknown>).en_US
      : raw;
    const result = await api.FormData.postFormsData({
      ...body,
      formData: flat as unknown as Parameters<typeof api.FormData.postFormsData>[0]['formData'],
    }, DEFAULT_LOCALE);
    if (isError(result)) {
      return { ok: false, status: 0, message: result.message ?? 'postFormsData failed' };
    }
    return { ok: true, data: result as unknown as T };
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : 'Network error' };
  }
}

/** SDK-backed PUT of an existing form-data record by id. */
async function formDataPut<T>(
  accessToken: string,
  id: number,
  body: object,
): Promise<T | null> {
  const api = getUserApi(accessToken);
  if (!api) return null;
  try {
    const result = await api.FormData.updateFormsDataByid(id, body);
    if (isError(result)) return null;
    return result as unknown as T;
  } catch {
    return null;
  }
}

/** SDK-backed DELETE of a form-data record by id. */
async function formDataDelete(
  accessToken: string,
  id: number,
): Promise<boolean> {
  const api = getUserApi(accessToken);
  if (!api) return false;
  try {
    const result = await api.FormData.deleteFormsDataByid(id);
    if (isError(result)) return false;
    return result === true;
  } catch {
    return false;
  }
}

type FormDataField = { marker?: string; type?: string; value?: unknown };
interface RawFormRecord {
  id: number;
  formIdentifier?: string;
  time?: string;
  /** OE returns either a flat array or `{ en_US: [...] }` depending on endpoint. */
  formData?: FormDataField[] | Record<string, FormDataField[]>;
}

const formDataArray = (rec: RawFormRecord, lang: string = DEFAULT_LOCALE): FormDataField[] => {
  const fd = rec.formData;
  if (Array.isArray(fd)) return fd;
  if (fd && typeof fd === 'object') return fd[lang] ?? [];
  return [];
};

const fieldValue = (rec: RawFormRecord, marker: string): string => {
  const f = formDataArray(rec).find((x) => x.marker === marker);
  return typeof f?.value === 'string' ? f.value : '';
};

function recordToAddress(rec: RawFormRecord): OeAddress {
  const name = fieldValue(rec, 'user_addresses_lable') || 'Address';
  const fullName = fieldValue(rec, 'user_addresses_recipient_name');
  const phone = fieldValue(rec, 'user_addresses_recipient_phone');
  const line1 = fieldValue(rec, 'user_addresses_line_1');
  const city = fieldValue(rec, 'user_addresses_city');
  const postcode = fieldValue(rec, 'user_addresses_post_code');
  const instructions = fieldValue(rec, 'user_addresses_special_instructions');
  return {
    id: String(rec.id),
    recordId: rec.id,
    name,
    fullName,
    phone,
    line1,
    city,
    postcode,
    instructions,
    full: `${fullName} · ${line1}, ${city} ${postcode} · ${phone}`,
  };
}

function addressToFormData(address: OeAddress): Array<{ marker: string; type: string; value: string | number }> {
  return [
    { marker: 'user_addresses_id', type: 'integer', value: address.recordId ?? Date.now() },
    { marker: 'user_addresses_lable', type: 'string', value: address.name },
    { marker: 'user_addresses_recipient_name', type: 'string', value: address.fullName },
    { marker: 'user_addresses_recipient_phone', type: 'string', value: address.phone },
    { marker: 'user_addresses_line_1', type: 'string', value: address.line1 },
    { marker: 'user_addresses_city', type: 'string', value: address.city },
    { marker: 'user_addresses_post_code', type: 'string', value: address.postcode },
    { marker: 'user_addresses_special_instructions', type: 'string', value: address.instructions ?? '' },
  ];
}

async function fetchUserAddresses(accessToken: string): Promise<OeAddress[]> {
  const result = await formDataGetByMarker(
    accessToken,
    'user_addresses',
    USER_ADDRESSES_MODULE_CONFIG_ID,
    {},
    100,
  );
  return (result?.items ?? []).map(recordToAddress);
}

async function postUserAddress(
  accessToken: string,
  userIdentifier: string,
  address: OeAddress,
): Promise<{ ok: true; record: RawFormRecord } | { ok: false; message: string }> {
  type PostResponse = RawFormRecord & { formData?: RawFormRecord; actionMessage?: string };
  const res = await formDataPost<PostResponse>(accessToken, {
    formIdentifier: 'user_addresses',
    formModuleConfigId: USER_ADDRESSES_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: addressToFormData(address) },
  });
  if (!res.ok) return { ok: false, message: res.message };
  // POST may respond either as a flat record `{id, formData[], ...}` or wrapped
  // as `{formData: {id, formData[], ...}, actionMessage}` depending on the form.
  const flat = res.data;
  const wrapped = flat.formData && typeof flat.formData === 'object' && !Array.isArray(flat.formData)
    ? (flat.formData as RawFormRecord)
    : flat;
  return { ok: true, record: wrapped };
}

async function putUserAddress(
  accessToken: string,
  recordId: number,
  address: OeAddress,
): Promise<boolean> {
  const result = await formDataPut<unknown>(accessToken, recordId, {
    langCode: DEFAULT_LOCALE,
    formData: addressToFormData(address),
  });
  return result !== null;
}

async function deleteUserAddress(accessToken: string, recordId: number): Promise<boolean> {
  return formDataDelete(accessToken, recordId);
}

// ── user_data form (one record per user — upsert) ───────────────────────────

interface UserDataExtras {
  lastName?: string;
  dob?: string;
  shoeSize?: string;
  clothingSize?: string;
  consentDataProcessing?: boolean;
  consentCrossBorder?: boolean;
}

async function fetchUserDataRecord(
  accessToken: string,
): Promise<{ recordId: number | null; extras: UserDataExtras }> {
  const result = await formDataGetByMarker(
    accessToken,
    'user_data',
    USER_DATA_MODULE_CONFIG_ID,
    {},
    10,
  );
  const rec = result?.items?.[0];
  if (!rec) return { recordId: null, extras: {} };
  return {
    recordId: rec.id,
    extras: {
      lastName: fieldValue(rec, 'user_last_name'),
      dob: fieldValue(rec, 'user_birthday'),
      shoeSize: fieldValue(rec, 'user_shoes_size'),
      clothingSize: fieldValue(rec, 'user_clothing_size'),
      consentDataProcessing: fieldValue(rec, 'user_consent_for_personal_data_processing') === 'true',
      consentCrossBorder: fieldValue(rec, 'user_consent_for_cross-border_data_transfer') === 'true',
    },
  };
}

function userDataToFormData(extras: UserDataExtras): Array<{ marker: string; type: string; value: string | number }> {
  const out: Array<{ marker: string; type: string; value: string | number }> = [];
  if (extras.lastName !== undefined) out.push({ marker: 'user_last_name', type: 'string', value: extras.lastName });
  if (extras.dob !== undefined) out.push({ marker: 'user_birthday', type: 'date', value: extras.dob });
  if (extras.shoeSize !== undefined && extras.shoeSize !== '') {
    const n = parseFloat(extras.shoeSize);
    if (Number.isFinite(n)) out.push({ marker: 'user_shoes_size', type: 'float', value: n });
  }
  if (extras.clothingSize !== undefined) out.push({ marker: 'user_clothing_size', type: 'string', value: extras.clothingSize });
  if (extras.consentDataProcessing !== undefined) {
    out.push({ marker: 'user_consent_for_personal_data_processing', type: 'radioButton', value: extras.consentDataProcessing ? 'true' : 'false' });
  }
  if (extras.consentCrossBorder !== undefined) {
    out.push({ marker: 'user_consent_for_cross-border_data_transfer', type: 'radioButton', value: extras.consentCrossBorder ? 'true' : 'false' });
  }
  return out;
}

async function upsertUserDataRecord(
  accessToken: string,
  userIdentifier: string,
  patch: UserDataExtras,
): Promise<boolean> {
  const current = await fetchUserDataRecord(accessToken);
  const merged: UserDataExtras = { ...current.extras, ...patch };
  const formData = userDataToFormData(merged);

  if (current.recordId) {
    const result = await formDataPut<unknown>(
      accessToken,
      current.recordId,
      { langCode: DEFAULT_LOCALE, formData },
    );
    return result !== null;
  }

  // No existing record. POST has a strict date validator that rejects every
  // format we've tried for `user_birthday`, while PUT accepts the value as-is.
  // So we POST without the date field first, then PUT the full payload to set
  // the date too.
  const { dob: _dropDob, ...patchWithoutDob } = merged;
  void _dropDob;
  const postData = userDataToFormData(patchWithoutDob);
  type PostResponse = RawFormRecord & { formData?: RawFormRecord };
  const created = await formDataPost<PostResponse>(accessToken, {
    formIdentifier: 'user_data',
    formModuleConfigId: USER_DATA_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: postData },
  });
  if (!created.ok) return false;
  const rec = created.data;
  const newId = (rec.formData && typeof rec.formData === 'object' && !Array.isArray(rec.formData)
    ? (rec.formData as RawFormRecord).id
    : rec.id);
  if (!newId) return true;
  if (merged.dob) {
    const result = await formDataPut<unknown>(
      accessToken,
      newId,
      { langCode: DEFAULT_LOCALE, formData },
    );
    return result !== null;
  }
  return true;
}

// ── subscription_management form (one record per user — upsert) ─────────────

interface SubsExtras {
  pushNotifications?: boolean;
  orderUpdates?: boolean;
  newArrivals?: boolean;
  saleAlerts?: boolean;
  loyaltyUpdates?: boolean;
  /** Stored here too for visibility in admin — duplicated from signin formData */
  emailNewsletter?: boolean;
  smsNotifications?: boolean;
}

async function fetchSubsRecord(
  accessToken: string,
): Promise<{ recordId: number | null; extras: SubsExtras }> {
  const result = await formDataGetByMarker(
    accessToken,
    'subscription_management',
    SUBSCRIPTION_MGMT_MODULE_CONFIG_ID,
    {},
    10,
  );
  const rec = result?.items?.[0];
  if (!rec) return { recordId: null, extras: {} };
  const b = (m: string) => fieldValue(rec, m) === 'true';
  return {
    recordId: rec.id,
    extras: {
      emailNewsletter: b('u_s_m_email_newsletter'),
      smsNotifications: b('u_s_m_sms_notifications'),
      pushNotifications: b('u_s_m_push_notifications'),
      orderUpdates: b('u_s_m_order_updates'),
      newArrivals: b('u_s_m_new_arrivals'),
      saleAlerts: b('u_s_m_sale_alerts'),
      loyaltyUpdates: b('u_s_m_loyalty_updates'),
    },
  };
}

function subsToFormData(extras: SubsExtras): Array<{ marker: string; type: string; value: string }> {
  const bool = (k: 'emailNewsletter' | 'smsNotifications' | 'pushNotifications' | 'orderUpdates' | 'newArrivals' | 'saleAlerts' | 'loyaltyUpdates'): string =>
    (extras[k] ? 'true' : 'false');
  return [
    { marker: 'u_s_m_email_newsletter', type: 'radioButton', value: bool('emailNewsletter') },
    { marker: 'u_s_m_sms_notifications', type: 'radioButton', value: bool('smsNotifications') },
    { marker: 'u_s_m_push_notifications', type: 'radioButton', value: bool('pushNotifications') },
    { marker: 'u_s_m_order_updates', type: 'radioButton', value: bool('orderUpdates') },
    { marker: 'u_s_m_new_arrivals', type: 'radioButton', value: bool('newArrivals') },
    { marker: 'u_s_m_sale_alerts', type: 'radioButton', value: bool('saleAlerts') },
    { marker: 'u_s_m_loyalty_updates', type: 'radioButton', value: bool('loyaltyUpdates') },
  ];
}

async function upsertSubsRecord(
  accessToken: string,
  userIdentifier: string,
  subs: OeSubscriptions,
): Promise<boolean> {
  const current = await fetchSubsRecord(accessToken);
  const formData = subsToFormData({
    emailNewsletter: subs.emailNewsletter,
    smsNotifications: subs.smsNotifications,
    pushNotifications: subs.pushNotifications,
    orderUpdates: subs.orderUpdates,
    newArrivals: subs.newArrivals,
    saleAlerts: subs.saleAlerts,
    loyaltyUpdates: subs.loyaltyUpdates,
  });
  if (current.recordId) {
    const result = await formDataPut<unknown>(
      accessToken,
      current.recordId,
      { langCode: DEFAULT_LOCALE, formData },
    );
    return result !== null;
  }
  const result = await formDataPost<RawFormRecord>(accessToken, {
    formIdentifier: 'subscription_management',
    formModuleConfigId: SUBSCRIPTION_MGMT_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: formData },
  });
  return result.ok;
}

async function putUser(accessToken: string, body: Record<string, unknown>): Promise<boolean> {
  const api = getUserApi(accessToken);
  if (!api) return false;
  // The SDK's `updateUser` takes `IUserBody` which itself allows `formData`
  // as either a single `IAuthFormData` or an array — we pass the array form
  // and the SDK layer handles serialisation. langCode is passed as the 2nd
  // argument to updateUser (not inside body).
  const normalized: Record<string, unknown> = { ...body };
  // If caller passed formData already wrapped as `{ en_US: [...] }`, unwrap
  // so we can hand a flat array to the SDK — updateUser writes the current
  // locale slot.
  if (
    normalized.formData
    && !Array.isArray(normalized.formData)
    && typeof normalized.formData === 'object'
    && 'en_US' in (normalized.formData as Record<string, unknown>)
  ) {
    normalized.formData = (normalized.formData as Record<string, unknown>).en_US;
  }
  const result = await api.Users.updateUser(
    normalized as unknown as Parameters<typeof api.Users.updateUser>[0],
    DEFAULT_LOCALE,
  );
  return result === true;
}
void DEFAULT_SUBSCRIPTIONS;

/**
 * Auth provider descriptor pulled from OE. Consumed by LoginModal /
 * RegisterModal (to render the social-button row) and by the
 * "Connected Social Accounts" section in the account page (which filters
 * out `email`). Only the fields the UI actually needs are exposed.
 */
export interface AuthProviderInfo {
  /** Provider marker — `'email'`, `'google'`, `'apple'`, `'facebook'`, … */
  identifier: string;
  /** Provider kind — matches identifier for most social providers; useful
   *  for distinguishing form-based (`email`, `phone`) from OAuth (`oauth`). */
  type: string;
  /** Human title from OE localizeInfos.en_US.title, falls back to identifier. */
  title: string;
  /** Form marker to load field schema (only meaningful for form-based auth). */
  formIdentifier?: string;
  /** Whether OE requires post-signup activation via `activateUser()`. */
  isCheckCode: boolean;
}

interface RawAuthProvider {
  identifier?: string;
  type?: string;
  formIdentifier?: string;
  isCheckCode?: boolean;
  localizeInfos?: Record<string, { title?: string } | undefined> | { title?: string };
}

/**
 * Return the list of authorization providers configured for the tenant.
 * The UI uses this to render social buttons + the connected-accounts row,
 * so the source of truth stays in OE (no hardcoded `['google', 'facebook']`).
 * Returns `[]` on any failure — social buttons simply won't render.
 */
export async function getAuthProvidersAction(): Promise<AuthProviderInfo[]> {
  if (!isOneEntryEnabled || !oneentry) return [];
  try {
    const result = await oneentry.AuthProvider.getAuthProviders();
    if (isError(result)) return [];
    const list = Array.isArray(result) ? (result as RawAuthProvider[]) : [];
    return list
      .filter((p): p is RawAuthProvider & { identifier: string } =>
        typeof p?.identifier === 'string' && p.identifier.length > 0)
      .map((p) => {
        const info = p.localizeInfos ?? {};
        // OE returns either { en_US: { title } } or a flat { title }.
        const localized = (info as Record<string, { title?: string } | undefined>).en_US;
        const title = (typeof localized === 'object' && localized?.title)
          || (info as { title?: string }).title
          || p.identifier;
        return {
          identifier: p.identifier,
          type: typeof p.type === 'string' ? p.type : p.identifier,
          title,
          formIdentifier: typeof p.formIdentifier === 'string' ? p.formIdentifier : undefined,
          isCheckCode: p.isCheckCode === true,
        };
      });
  } catch {
    return [];
  }
}

export async function signInAction(
  login: string,
  password: string,
): Promise<AuthResult> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  try {
    const result = await oneentry.AuthProvider.auth(AUTH_MARKER, {
      authData: [
        { marker: 'email', value: login.trim() },
        { marker: 'password', value: password },
      ],
    });
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'Sign-in failed' };
    }
    const jar = (await cookies()) as unknown as CookieJar;
    await setSessionCookies(jar, result);
    const user = await fetchMe(result.accessToken);
    return { ok: true, userIdentifier: result.userIdentifier, user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Sign-in failed' };
  }
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  phone: string;
  gender?: 'female' | 'male';
  subscribeEmail?: boolean;
  subscribeSms?: boolean;
  agreed?: boolean;
}

export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  const email = input.email.trim();
  // OneEntry value formats vary per attribute type:
  //   string      → string
  //   list        → string[] (the option marker)
  //   radioButton → string (must match a configured listTitles value, e.g. "true")
  const formData: Array<{ marker: string; type: string; value: string | string[] }> = [
    { marker: 'first_name', type: 'string', value: input.firstName.trim() },
    { marker: 'phone', type: 'string', value: input.phone.trim() },
  ];
  if (input.gender) {
    formData.push({ marker: 'gender', type: 'list', value: [input.gender] });
  }
  if (input.subscribeEmail !== undefined) {
    formData.push({ marker: 'users_subscribe_to_promotional_email', type: 'radioButton', value: input.subscribeEmail ? 'true' : 'false' });
  }
  if (input.subscribeSms !== undefined) {
    formData.push({ marker: 'users_subscribe_to_promotional_sms', type: 'radioButton', value: input.subscribeSms ? 'true' : 'false' });
  }
  if (input.agreed) {
    formData.push({ marker: 'users_agree', type: 'radioButton', value: 'true' });
  }
  try {
    const signUpRes = await oneentry.AuthProvider.signUp(AUTH_MARKER, {
      formIdentifier: SIGNUP_FORM_IDENTIFIER,
      authData: [
        { marker: 'email', value: email },
        { marker: 'password', value: input.password },
      ],
      formData: formData as unknown as Parameters<typeof oneentry.AuthProvider.signUp>[1]['formData'],
      notificationData: {
        email,
        phonePush: input.phone.trim() ? [input.phone.trim()] : [],
        phoneSMS: input.phone.trim() || undefined,
      },
    });
    if (isError(signUpRes)) {
      return { ok: false, error: signUpRes.message ?? 'Sign-up failed' };
    }
    // No activation flow (isCheckCode=false) — log in right away.
    return await signInAction(email, input.password);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Sign-up failed' };
  }
}

const GOOGLE_AUTH_MARKER = 'google';
const GOOGLE_OAUTH_STATE_COOKIE = 'oe_google_oauth_state';
const GOOGLE_OAUTH_RETURN_COOKIE = 'oe_google_oauth_return';
const GOOGLE_CALLBACK_PATH = '/auth/callback/google';

function absoluteCallbackUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}${GOOGLE_CALLBACK_PATH}`;
}

/**
 * Kick off Google OAuth per MCP `auth-provider` rule: read `config.oauthAuthUrl`
 * from the OE provider, build the authorize URL with `response_type=code`, set
 * an httpOnly CSRF state cookie, and return the URL for the client to redirect
 * to. The client never sees `client_secret` — OE holds it and does the
 * server-side code exchange inside `AuthProvider.oauth`.
 */
export interface GoogleOAuthStart {
  ok: true;
  url: string;
}
export interface GoogleOAuthStartError {
  ok: false;
  error: string;
}
export async function getGoogleAuthUrlAction(
  origin: string,
  returnTo?: string,
): Promise<GoogleOAuthStart | GoogleOAuthStartError> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set' };
  }
  if (!origin || !/^https?:\/\//i.test(origin)) {
    return { ok: false, error: 'Invalid origin' };
  }
  try {
    const provider = await oneentry.AuthProvider.getAuthProviderByMarker(GOOGLE_AUTH_MARKER);
    if (isError(provider)) {
      return { ok: false, error: provider.message ?? 'Google provider not found' };
    }
    const oauthAuthUrl = provider.config?.oauthAuthUrl;
    if (!oauthAuthUrl) {
      return { ok: false, error: 'Provider missing oauthAuthUrl' };
    }
    const state = crypto.randomUUID();
    const redirectUri = absoluteCallbackUri(origin);
    const url = new URL(oauthAuthUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);

    const jar = (await cookies()) as unknown as CookieJar;
    const baseOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 10,
    };
    jar.set(GOOGLE_OAUTH_STATE_COOKIE, state, baseOpts);
    // Only allow local return paths, never full URLs — prevents open-redirect.
    const safeReturn = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/';
    jar.set(GOOGLE_OAUTH_RETURN_COOKIE, safeReturn, baseOpts);
    return { ok: true, url: url.toString() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google auth-url failed' };
  }
}

/**
 * Exchange the Google `?code=` returned to the callback route for an OE
 * session. Per the MCP rule and the SDK docs, OE expects `{ code, redirect_uri }`
 * on the tenant side (`client_id` / `client_secret` live in OE), so we send
 * only those two fields even though the SDK's generated TS shape includes more.
 */
export interface GoogleCallbackContext {
  code: string;
  state: string;
  origin: string;
}
export async function exchangeGoogleCodeAction(
  ctx: GoogleCallbackContext,
): Promise<AuthResult & { returnTo?: string }> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  if (!ctx.code) return { ok: false, error: 'Missing Google authorization code' };

  const jar = (await cookies()) as unknown as CookieJar;
  const savedState = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? '';
  const returnTo = jar.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value ?? '/';
  // Consume the CSRF pair immediately so the code can only be redeemed once.
  jar.delete(GOOGLE_OAUTH_STATE_COOKIE);
  jar.delete(GOOGLE_OAUTH_RETURN_COOKIE);

  if (!savedState || savedState !== ctx.state) {
    return { ok: false, error: 'OAuth state mismatch (possible CSRF)' };
  }

  try {
    const redirectUri = absoluteCallbackUri(ctx.origin);
    const body = { code: ctx.code, redirect_uri: redirectUri };
    const result = await oneentry.AuthProvider.oauth(
      GOOGLE_AUTH_MARKER,
      body as unknown as Parameters<typeof oneentry.AuthProvider.oauth>[1],
    );
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'Google sign-in rejected by OneEntry' };
    }
    const entity = result as OeAuthEntity;
    await setSessionCookies(jar, entity);
    const user = await fetchMe(entity.accessToken);
    return { ok: true, userIdentifier: entity.userIdentifier, user, returnTo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed' };
  }
}


export async function signOutAction(): Promise<{ ok: boolean }> {
  const jar = (await cookies()) as unknown as CookieJar;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (oneentry && refresh) {
    try {
      await oneentry.AuthProvider.logout(AUTH_MARKER, refresh);
    } catch {
      /* ignore — clearing cookies is the source of truth client-side */
    }
  }
  await clearSessionCookies(jar);
  return { ok: true };
}

/**
 * Move an order into the tenant's cancellation status. Looks up the storage's
 * status list and picks the one whose identifier or title matches "cancel"
 * (case-insensitive) — the tenant's actual marker (`home_cancelled`,
 * `store_pickup_cancelled`, `homeCancelled`, `home_cancel`, …) is discovered
 * dynamically. Falls back to `<storage>_cancelled` when the list can't be
 * fetched but the pattern is common enough that OE usually still accepts it.
 */
export async function cancelOrderAction(
  orderId: number,
  storage: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOneEntryEnabled) return { ok: false, error: 'OneEntry is not configured' };
  if (!orderId || !storage) return { ok: false, error: 'Missing order id or storage' };
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, error: 'Not signed in' };
  const api = getUserApi(access);
  if (!api) return { ok: false, error: 'OneEntry SDK not initialised' };
  try {
    // 1. Load the existing order — `updateOrderByMarkerAndId` demands the
    //    full `IOrderData` (formIdentifier + paymentAccountIdentifier +
    //    formData + products), NOT a partial patch. Sending only
    //    `{ statusIdentifier }` triggers OE's "Order must have a payment"
    //    (and similar) validators.
    const existing = await api.Orders.getOrderByMarkerAndId(storage, orderId, DEFAULT_LOCALE);
    if (isError(existing)) return { ok: false, error: existing.message ?? `HTTP ${existing.statusCode}` };
    const cur = existing as unknown as {
      formIdentifier?: string;
      paymentAccountIdentifier?: string;
      formData?: unknown;
      // OE's `getOrderByMarkerAndId` returns products with the shape
      // `{ id, quantity, title, price, sku, previewImage }`, but
      // `updateOrderByMarkerAndId` expects `{ productId, quantity }` per
      // `IOrderProductData`. We remap below so the update passes the
      // strict-typed schema check ("productId must be a number").
      products?: Array<{ id?: number; productId?: number; quantity?: number }>;
      currency?: string;
      couponCode?: string;
      bonusAmount?: number;
    };
    const productsForUpdate = Array.isArray(cur.products)
      ? cur.products
          .map((p) => ({
            productId: Number(p.productId ?? p.id ?? 0),
            quantity: Number(p.quantity ?? 1),
          }))
          .filter((p) => Number.isFinite(p.productId) && p.productId > 0)
      : [];

    // 2. Discover the cancellation status marker — regex match on the
    //    tenant's status list, fall back to `${storage}_cancelled`.
    let cancelledMarker = '';
    const statuses = await api.Orders.getAllStatusesByStorageMarker(storage, DEFAULT_LOCALE, 0, 100);
    if (!isError(statuses) && Array.isArray(statuses)) {
      const match = statuses.find((s) => {
        const info = s as { identifier?: string; localizeInfos?: { title?: string } };
        return /cancel/i.test(info.identifier ?? '') || /cancel/i.test(info.localizeInfos?.title ?? '');
      });
      if (match) cancelledMarker = (match as { identifier?: string }).identifier ?? '';
    }
    if (!cancelledMarker) cancelledMarker = `${storage}_cancelled`;

    // 3. Send back the full order body with just `statusIdentifier` swapped.
    //    Empty-string fallbacks on required fields let OE's schema pass —
    //    they'll be echoed back unchanged since we're not really editing them.
    const body: Record<string, unknown> = {
      formIdentifier: cur.formIdentifier ?? '',
      paymentAccountIdentifier: cur.paymentAccountIdentifier ?? '',
      formData: cur.formData ?? [],
      products: productsForUpdate,
      statusIdentifier: cancelledMarker,
    };
    if (cur.currency) body.currency = cur.currency;
    if (cur.couponCode) body.couponCode = cur.couponCode;
    if (typeof cur.bonusAmount === 'number') body.bonusAmount = cur.bonusAmount;

    const result = await api.Orders.updateOrderByMarkerAndId(
      storage,
      orderId,
      body as unknown as Parameters<typeof api.Orders.updateOrderByMarkerAndId>[2],
      DEFAULT_LOCALE,
    );
    if (isError(result)) return { ok: false, error: result.message ?? `HTTP ${result.statusCode}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Bonus-programme transaction. Mirrors OE's `IBonusTransactionEntity` from
 * `oneentry/dist/discounts/discountsInterfaces` — we only surface the fields
 * the account UI actually renders. `sign` is a derived convenience: `+1` for
 * accruals and reversal-of-usage (bonuses coming back), `-1` for spending,
 * expirations and admin reductions.
 */
export interface OeBonusTransaction {
  amount: number;
  /** OE marker — `ACCRUAL` | `USAGE` | `REDUCE` | `REVERSAL_ACCRUAL` |
   *  `REVERSAL_USAGE` | `EXPIRATION`. */
  type: string;
  createdAt: string | null;
  comment: string | null;
  sign: 1 | -1;
}

const POSITIVE_BONUS_TYPES = new Set(['ACCRUAL', 'REVERSAL_USAGE']);

export async function fetchBonusHistoryAction(): Promise<OeBonusTransaction[]> {
  if (!isOneEntryEnabled) return [];
  const access = await readAccessOrRefresh();
  if (!access) return [];
  const api = getUserApi(access);
  if (!api) return [];
  try {
    const result = await api.Discounts.getBonusHistory();
    if (isError(result)) return [];
    // OE returns `{ items, total }` (paginated), not a bare array as the
    // SDK types suggest. Unwrap both shapes so the section renders whether
    // OE swaps the response format in a future SDK.
    const list: unknown[] = Array.isArray(result)
      ? (result as unknown[])
      : Array.isArray((result as { items?: unknown[] })?.items)
        ? ((result as { items: unknown[] }).items)
        : [];
    return list.map((raw): OeBonusTransaction => {
      const r = raw as {
        amount?: number;
        type?: string;
        createdAt?: string;
        comment?: string | null;
      };
      const type = String(r.type ?? '').toUpperCase();
      return {
        amount: Number(r.amount ?? 0),
        type,
        createdAt: r.createdAt ?? null,
        comment: r.comment ?? null,
        sign: POSITIVE_BONUS_TYPES.has(type) ? 1 : -1,
      };
    });
  } catch {
    return [];
  }
}

export async function getCurrentUserAction(): Promise<OeUser | null> {
  const jar = (await cookies()) as unknown as CookieJar;
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const me = await fetchMe(access);
  if (me) return me;
  // Access token may have expired — try refresh.
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh || !oneentry) return null;
  try {
    const refreshed = await oneentry.AuthProvider.refresh(AUTH_MARKER, refresh);
    if (isError(refreshed)) {
      await clearSessionCookies(jar);
      return null;
    }
    await setSessionCookies(jar, refreshed);
    return await fetchMe(refreshed.accessToken);
  } catch {
    await clearSessionCookies(jar);
    return null;
  }
}

// ── Profile mutations ────────────────────────────────────────────────────────

export interface ProfileUpdate {
  firstName?: string;
  email?: string;
  phone?: string;
  gender?: 'female' | 'male' | 'other';
  lastName?: string;
  dob?: string;
  shoeSize?: string;
  clothingSize?: string;
}

export async function updateProfileAction(
  patch: ProfileUpdate,
): Promise<{ ok: boolean; error?: string }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, error: 'Not authenticated' };
  const jar = (await cookies()) as unknown as CookieJar;
  const userIdentifier = jar.get(IDENTIFIER_COOKIE)?.value ?? '';

  // 1) Fields living in the sign-in form (PUT /me)
  const formData: Array<{ marker: string; type: string; value: string | string[] }> = [];
  if (patch.firstName !== undefined) formData.push({ marker: 'first_name', type: 'string', value: patch.firstName });
  if (patch.phone !== undefined) formData.push({ marker: 'phone', type: 'string', value: patch.phone });
  if (patch.gender !== undefined) formData.push({ marker: 'gender', type: 'list', value: [patch.gender] });
  let signinOk = true;
  if (formData.length > 0) {
    signinOk = await putUser(access, { formIdentifier: SIGNUP_FORM_IDENTIFIER, formData });
  }

  // 2) Profile extras live in the user_data form-data record
  const extrasPatch: UserDataExtras = {};
  if (patch.lastName !== undefined) extrasPatch.lastName = patch.lastName;
  if (patch.dob !== undefined) extrasPatch.dob = patch.dob;
  if (patch.shoeSize !== undefined) extrasPatch.shoeSize = patch.shoeSize;
  if (patch.clothingSize !== undefined) extrasPatch.clothingSize = patch.clothingSize;
  let extrasOk = true;
  if (Object.keys(extrasPatch).length > 0 && userIdentifier) {
    extrasOk = await upsertUserDataRecord(access, userIdentifier, extrasPatch);
  }

  return signinOk && extrasOk ? { ok: true } : { ok: false, error: 'Update failed' };
}

export async function updateAddressesAction(
  addresses: OeAddress[],
): Promise<{ ok: boolean; error?: string; addresses?: OeAddress[] }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, error: 'Not authenticated' };
  const jar = (await cookies()) as unknown as CookieJar;
  const userIdentifier = jar.get(IDENTIFIER_COOKIE)?.value ?? '';
  if (!userIdentifier) return { ok: false, error: 'Missing user identifier' };

  const existing = await fetchUserAddresses(access);
  const existingById = new Map(existing.map((a) => [a.recordId!, a]));
  const incomingRecordIds = new Set(addresses.map((a) => a.recordId).filter((v): v is number => typeof v === 'number'));

  // Delete records that are no longer in the incoming list
  await Promise.all(
    existing
      .filter((a) => a.recordId !== undefined && !incomingRecordIds.has(a.recordId))
      .map((a) => deleteUserAddress(access, a.recordId!)),
  );

  // POST new (no recordId) and PUT existing
  const finalised: OeAddress[] = [];
  const errors: string[] = [];
  for (const addr of addresses) {
    if (addr.recordId && existingById.has(addr.recordId)) {
      const ok = await putUserAddress(access, addr.recordId, addr);
      if (!ok) errors.push(`Could not update address "${addr.name}" (PUT not allowed for users — admin must grant rights or use POST-only flow)`);
      finalised.push({ ...addr, id: String(addr.recordId) });
    } else {
      const created = await postUserAddress(access, userIdentifier, addr);
      if (created.ok && created.record.id) {
        finalised.push({ ...addr, id: String(created.record.id), recordId: created.record.id });
      } else {
        errors.push(created.ok ? `POST returned no record id for "${addr.name}"` : `Address "${addr.name}": ${created.message}`);
        finalised.push(addr);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; '), addresses: finalised };
  }
  return { ok: true, addresses: finalised };
}

export async function updateSubscriptionsAction(
  subs: OeSubscriptions,
): Promise<{ ok: boolean; error?: string }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, error: 'Not authenticated' };
  const jar = (await cookies()) as unknown as CookieJar;
  const userIdentifier = jar.get(IDENTIFIER_COOKIE)?.value ?? '';

  // 1) email/sms remain mirrored in sign-in formData (they're declared there)
  const signinOk = await putUser(access, {
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    formData: [
      { marker: 'users_subscribe_to_promotional_email', type: 'radioButton', value: subs.emailNewsletter ? 'true' : 'false' },
      { marker: 'users_subscribe_to_promotional_sms', type: 'radioButton', value: subs.smsNotifications ? 'true' : 'false' },
    ],
  });

  // 2) All 7 toggles live in the subscription_management form-data record
  const formOk = userIdentifier ? await upsertSubsRecord(access, userIdentifier, subs) : false;

  return signinOk && formOk ? { ok: true } : { ok: false, error: 'Update failed' };
}

export async function updateConsentAction(
  consent: OeConsent,
): Promise<{ ok: boolean; error?: string }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, error: 'Not authenticated' };
  const jar = (await cookies()) as unknown as CookieJar;
  const userIdentifier = jar.get(IDENTIFIER_COOKIE)?.value ?? '';
  if (!userIdentifier) return { ok: false, error: 'Missing user identifier' };

  // Both consents live in the user_data form. The cross-border radioButton
  // needs option values "true"/"false" configured in the CMS — otherwise OE
  // returns "there aren't list values for type radioButton".
  const ok = await upsertUserDataRecord(access, userIdentifier, {
    consentDataProcessing: consent.dataProcessing,
    consentCrossBorder: consent.crossBorder,
  });

  return ok ? { ok: true } : { ok: false, error: 'Update failed' };
}

// ── Cart / Wishlist ──────────────────────────────────────────────────────────

export async function syncCartAction(
  items: OeCartItem[],
): Promise<{ ok: boolean; items: OeCartItem[] }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, items: [] };
  const api = getUserApi(access);
  if (!api) return { ok: false, items: [] };
  const result = await api.Users.setCart({ items });
  if (isError(result)) return { ok: false, items: [] };
  return { ok: true, items: result.items ?? [] };
}

export async function getCartAction(): Promise<OeCartItem[]> {
  const access = await readAccessOrRefresh();
  if (!access) return [];
  const api = getUserApi(access);
  if (!api) return [];
  const result = await api.Users.getCart();
  if (isError(result)) return [];
  return result.items ?? [];
}

export async function syncWishlistAction(
  items: OeWishlistItem[],
): Promise<{ ok: boolean; items: OeWishlistItem[] }> {
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, items: [] };
  const api = getUserApi(access);
  if (!api) return { ok: false, items: [] };
  const result = await api.Users.setWishlist({ items });
  if (isError(result)) return { ok: false, items: [] };
  return { ok: true, items: result.items ?? [] };
}

export async function getWishlistAction(): Promise<OeWishlistItem[]> {
  const access = await readAccessOrRefresh();
  if (!access) return [];
  const api = getUserApi(access);
  if (!api) return [];
  const result = await api.Users.getWishlist();
  if (isError(result)) return [];
  return result.items ?? [];
}

// ── Recently viewed (stored on the user `state` blob) ────────────────────────

const RECENTLY_VIEWED_MAX = 100;

/** Append a product to the user's recently-viewed trail and persist it on
 *  the OE user `state` blob. Dedupes against existing entries and bounds the
 *  list to `RECENTLY_VIEWED_MAX`. No-op for unauthenticated visitors (the
 *  client-side Redux slice still keeps an in-memory trail for guests).
 */
export async function pushRecentlyViewedAction(
  productId: number,
): Promise<{ ok: boolean; items: OeRecentlyViewedItem[] }> {
  if (!Number.isFinite(productId) || productId <= 0) return { ok: false, items: [] };
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, items: [] };
  const currentState = await readStateFromMe(access);
  const prev = Array.isArray(currentState.recentlyViewed) ? currentState.recentlyViewed : [];
  // Strip any existing entry for the same product so we can prepend a fresh one.
  const without = prev.filter((it) => Number(it.productId) !== productId);
  const next: OeRecentlyViewedItem[] = [
    { productId, viewedAt: new Date().toISOString() },
    ...without,
  ].slice(0, RECENTLY_VIEWED_MAX);
  const nextState: OeUserState = { ...currentState, recentlyViewed: next };
  const ok = await putUser(access, {
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    state: nextState,
  });
  return { ok, items: ok ? next : prev };
}

/** Read the user's recently-viewed trail straight from OE user state. */
export async function getRecentlyViewedAction(): Promise<OeRecentlyViewedItem[]> {
  const access = await readAccessOrRefresh();
  if (!access) return [];
  const state = await readStateFromMe(access);
  return Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [];
}

/** Bulk-merge a client-built trail into the OE state. Used after sign-in so
 *  the guest's local list is preserved into the server record without losing
 *  the existing server entries. Latest-wins on duplicates. */
export async function mergeRecentlyViewedAction(
  incoming: OeRecentlyViewedItem[],
): Promise<{ ok: boolean; items: OeRecentlyViewedItem[] }> {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return { ok: true, items: await getRecentlyViewedAction() };
  }
  const access = await readAccessOrRefresh();
  if (!access) return { ok: false, items: [] };
  const currentState = await readStateFromMe(access);
  const server = Array.isArray(currentState.recentlyViewed) ? currentState.recentlyViewed : [];
  const byId = new Map<number, OeRecentlyViewedItem>();
  for (const it of [...incoming, ...server]) {
    const pid = Number(it.productId);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    const existing = byId.get(pid);
    if (!existing || new Date(it.viewedAt).getTime() > new Date(existing.viewedAt).getTime()) {
      byId.set(pid, { productId: pid, viewedAt: it.viewedAt });
    }
  }
  const merged = [...byId.values()]
    .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
    .slice(0, RECENTLY_VIEWED_MAX);
  const nextState: OeUserState = { ...currentState, recentlyViewed: merged };
  const ok = await putUser(access, {
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    state: nextState,
  });
  return { ok, items: ok ? merged : server };
}

// ── Orders ───────────────────────────────────────────────────────────────────

export type CheckoutMethod = 'home' | 'store_pickup' | 'locker';

/** Preview-only order calculation. Server applies all active discounts
 *  (personal PERSONAL_DISCOUNT gated by user-group + LTV, plus the optional
 *  coupon), and honours a `bonusAmount` deduction. Nothing is persisted. */
export interface PreviewOrderInput {
  products: Array<{ productId: number; quantity: number }>;
  couponCode?: string;
  /** How many bonus points the shopper wants to burn on this order. Server
   *  clamps it to `min(balance, maxBonusPaymentPercent × total)`. */
  bonusAmount?: number;
  currency?: string;
  /** Anonymous session identifier for guest checkout. When present (and no
   *  access cookie is set), we call OE via `getGuestApi(guestId)` so guest
   *  coupons (`SUMMER2026`, …) still validate + apply. Auth cookies take
   *  precedence when both are present. */
  guestId?: string;
}
/**
 * Bonus-programme constraints echoed by OE's `previewOrder`. Sourced from
 * `preview.discountConfig.bonus` (per-order values) and `.settings`
 * (tenant-wide caps). Used by the checkout UI to clamp the "use N bonuses"
 * input and to show hints when the cart doesn't qualify.
 */
export interface PreviewBonusConfig {
  /** User's total bonus balance (across all bonus types). */
  availableBalance: number;
  /** Maximum bonus deduction allowed on this specific order, computed by
   *  OE from `maxBonusPaymentPercent × totalSum` and per-account rules.
   *  `0` when bonuses can't reduce this order at all. */
  maxAmount: number;
  /** Minimum bonuses the shopper must redeem in one go (from admin panel).
   *  `null` when unset — no lower bound. */
  minAmount: number | null;
  /** Minimum cart total required to unlock the bonus feature.
   *  `null` when unset — no gate. */
  minOrderAmount: number | null;
}

export interface PreviewOrderResult {
  ok: true;
  /** Subtotal before any discounts / bonuses (in currency units). */
  totalSum: number;
  /** Total after coupon + personal discount, before bonuses are burned. */
  totalSumWithDiscount: number;
  /** Bonus points OE actually deducted (may be less than requested). */
  bonusApplied: number;
  /** Cash amount to charge after discounts + bonuses. */
  totalDue: number;
  /** Aggregate discount ($) so the UI can show a single "Discount −$X" line. */
  discountAmount: number;
  currency: string;
  /** Bonus constraints for this order — see `PreviewBonusConfig`. */
  bonus: PreviewBonusConfig;
  /** `true` when a `couponCode` was passed AND OE actually applied it to the
   *  order (`discountConfig.coupon.applied === true`). Callers use this to
   *  tell "code applied" from "code valid but conditions not met" vs. the
   *  tier-fallback we add server-side. */
  couponApplied: boolean;
  /** `true` when OE recognised the code (`coupon.valid`) but refused to apply
   *  it (`applied === false`) — usually because of unmet conditions
   *  (min cart, applicability, expiry). Callers use this for a specific
   *  error message instead of the generic "invalid code" one. */
  couponValidButNotApplied: boolean;
  /** Human-readable reason the coupon was rejected. Filled by a follow-up
   *  `Discounts.getDiscountByMarker` fetch when OE returns `applied: false`
   *  with a known `discountIdentifier`. Examples:
   *   • `"Add $61.00 more to unlock SUMMER2026 (minimum $100.00)"` — MIN_CART_AMOUNT
   *   • `"SUMMER2026 unlocks after $100.00 in lifetime purchases"` — USER_LTV
   *   • `"SUMMER2026 doesn't apply to items in your cart"` — PRODUCT/CATEGORY
   *  `null` when we can't infer a reason. */
  couponReason: string | null;
  /** How much the coupon alone knocked off (before tier fallback). Zero when
   *  no code was passed or OE didn't apply it. */
  couponDiscountAmount: number;
}
export type PreviewOrderResponse =
  | PreviewOrderResult
  | {
      ok: false;
      error: string;
      /** OE-numeric productIds this preview failed on because the products no
       *  longer exist server-side. Extracted from the OE error message (which
       *  is shaped as `"Product <id> not found"`). Clients use this to prune
       *  their local cart so subsequent previews succeed. Empty for other
       *  kinds of failures (network, coupon, etc.). */
      missingProductIds: number[];
    };

export async function previewOrderAction(input: PreviewOrderInput): Promise<PreviewOrderResponse> {
  if (!isOneEntryEnabled) return { ok: false, error: 'OneEntry env not configured', missingProductIds: [] };

  const access = await readAccessOrRefresh();
  // Auth wins when both are present. For guests we still call OE via
  // `getGuestApi(guestId)` so guest-eligible coupons (SUMMER2026 etc.) can
  // validate and the shopper sees the same discount line the logged-in one
  // would. Only the "no access, no guest id" path short-circuits — nothing
  // to identify the request with.
  const api = access ? getUserApi(access) : (input.guestId ? getGuestApi(input.guestId) : null);
  if (!api) {
    return {
      ok: true, totalSum: 0, totalSumWithDiscount: 0, bonusApplied: 0,
      totalDue: 0, discountAmount: 0, currency: input.currency ?? 'USD',
      bonus: { availableBalance: 0, maxAmount: 0, minAmount: null, minOrderAmount: null },
      couponApplied: false, couponValidButNotApplied: false,
      couponReason: null, couponDiscountAmount: 0,
    };
  }

  try {
    // OE's `previewOrder` does not auto-apply `PERSONAL_DISCOUNT` for the
    // authenticated user. The SDK's `ICreateOrderPreview` exposes
    // `additionalDiscountsMarkers` — we pass the tier marker(s) explicitly
    // for LOGGED-IN shoppers only. OE still validates each marker's
    // `USER_LTV`/`USER_GROUP` conditions server-side, so passing all four
    // tiers is safe: the shopper only gets the discount they qualify for.
    // Skipped for guests because personal tiers are user-gated and passing
    // them alongside a `couponCode` empirically prevents OE from applying
    // the coupon (observed with `SUMMER2026` on this tenant).
    const body = {
      products: input.products,
      // Use the shared TIER_MARKERS constant so a rename in `fetchLoyalty`
      // propagates here without a stale copy silently dropping tiers.
      ...(access ? { additionalDiscountsMarkers: [...TIER_MARKERS] } : {}),
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      ...(typeof input.bonusAmount === 'number' && input.bonusAmount > 0
        ? { bonusAmount: input.bonusAmount } : {}),
    } as unknown as Parameters<typeof api.Orders.previewOrder>[0];
    const result = await api.Orders.previewOrder(body, DEFAULT_LOCALE);
    if (isError(result)) {
      const message = result.message ?? 'previewOrder failed';
      // OE surfaces missing products as `"Product 9171 not found"` (one id per
      // message, but scanning globally future-proofs if the format changes to
      // list several). Callers use this to prune the local cart so the next
      // preview succeeds instead of getting stuck retrying the same dead id.
      const missingProductIds = Array.from(
        message.matchAll(/product\s+(\d+)\s+not\s+found/gi),
        (m) => Number(m[1]),
      ).filter((n) => Number.isFinite(n));
      return { ok: false, error: message, missingProductIds };
    }
    const obj = result as unknown as Record<string, unknown>;
    const totalSum = Number(obj.totalSum ?? 0);
    let totalSumWithDiscount = Number(obj.totalSumWithDiscount ?? totalSum);
    const bonusApplied = Number(obj.bonusApplied ?? 0);
    let totalDue = Number(obj.totalDue ?? Math.max(0, totalSumWithDiscount - bonusApplied));
    let discountAmount = Math.max(0, totalSum - totalSumWithDiscount);
    // OE's response for a coupon is `discountConfig.coupon = { code, valid,
    // applied, ... }`. `valid` means the code exists in the admin panel;
    // `applied` means it actually reduced this order. We need `applied` —
    // a valid-but-not-applied code (min cart, applicability, expiry) is a
    // user-visible failure, not a success.
    const rawDiscountConfig = (obj.discountConfig ?? {}) as {
      coupon?: {
        code?: string;
        valid?: boolean;
        applied?: boolean;
        discountId?: number;
        discountIdentifier?: string;
      } | null;
    };
    const rawCoupon = rawDiscountConfig.coupon ?? null;
    const couponApplied = input.couponCode != null && rawCoupon?.applied === true;
    // OE tells us `valid` separately — `valid && !applied` = conditions
    // aren't met. Distinguish so we can surface the right error message.
    const couponValidButNotApplied = input.couponCode != null
      && rawCoupon?.valid === true && rawCoupon?.applied !== true;
    const couponDiscountAmount = couponApplied ? discountAmount : 0;

    // When OE says "valid but not applied", follow up with a
    // `getDiscountByMarker` call so we can tell the shopper WHY. Costs one
    // extra request but only fires on the failure path (typically once when
    // the user hits "Apply"). Skipped on success — no reason needed.
    let couponReason: string | null = null;
    if (couponValidButNotApplied && rawCoupon?.discountIdentifier) {
      try {
        // Use the app-token singleton for the config lookup — for guests
        // the user-scoped call returns 403 "Permission data not found"
        // because there's no user session, but the app-token client can
        // read the public discount config just fine.
        const cfg = await oneentry!.Discounts.getDiscountByMarker(rawCoupon.discountIdentifier, DEFAULT_LOCALE);
        if (!isError(cfg)) {
          const cfgObj = cfg as unknown as {
            // OE returns `conditionType` on the wire but the SDK typing
            // (`IDiscountCondition.type`) uses a different key — support both
            // so we survive either shape.
            conditions?: Array<{ type?: string; conditionType?: string; value?: unknown }>;
            endDate?: string | null;
          };
          const codeLabel = input.couponCode ?? rawCoupon.discountIdentifier;
          const conditions = Array.isArray(cfgObj.conditions) ? cfgObj.conditions : [];
          // Order matters: check gates the shopper can actually resolve first.
          for (const c of conditions) {
            const type = String(c.conditionType ?? c.type ?? '').toUpperCase();
            const val = c.value;
            if (type === 'MIN_CART_AMOUNT') {
              const min = typeof val === 'object' && val !== null
                ? Number((val as { amount?: number }).amount ?? 0)
                : Number(val ?? 0);
              if (min > 0 && totalSum < min) {
                const remaining = min - totalSum;
                couponReason = `Add $${remaining.toFixed(2)} more to unlock ${codeLabel} (minimum $${min.toFixed(2)})`;
                break;
              }
            } else if (type === 'USER_LTV') {
              const threshold = typeof val === 'object' && val !== null
                ? Number((val as { amount?: number }).amount ?? 0)
                : Number(val ?? 0);
              if (threshold > 0) {
                couponReason = `${codeLabel} unlocks after $${threshold.toFixed(2)} in lifetime purchases`;
                break;
              }
            } else if (type === 'PRODUCT' || type === 'PRODUCT_IN_CART'
              || type === 'CATEGORY' || type === 'CATEGORY_IN_CART' || type === 'ATTRIBUTE') {
              couponReason = `${codeLabel} doesn't apply to items in your cart`;
              break;
            }
          }
          if (!couponReason && cfgObj.endDate) {
            const end = new Date(cfgObj.endDate).getTime();
            if (Number.isFinite(end) && end < Date.now()) {
              couponReason = `${codeLabel} has expired`;
            }
          }
        }
      } catch {
        /* config lookup failed — fall back to generic message on client */
      }
    }

    // Fallback: when OE returns no discount despite the shopper qualifying
    // for a personal tier (Bronze/Silver/…) we compute it ourselves from
    // the tier config. Root cause: on this tenant OE's server-side LTV
    // counter appears not to match what `fetchLoyalty` reads from the
    // `USER_LTV` condition, so `previewOrder` skips the `PERSONAL_DISCOUNT`
    // even when `additionalDiscountsMarkers` includes the tier. Keeps the
    // UI honest with what the account page advertises. Skips for guests —
    // tiers are LTV-gated so there's nothing to fall back to.
    if (discountAmount === 0 && totalSum > 0 && access) {
      const [me, loyalty] = await Promise.all([
        fetchMe(access),
        fetchLoyalty(access),
      ]);
      const orders = me?.orders ?? [];
      const REVENUE = /paid|complete|deliver|done|closed|finish/i;
      const REVERSAL = /cancel|refund|reject|void|fail|declin|return/i;
      const ltv = orders.reduce((sum, o) => {
        const status = (o.statusIdentifier ?? '').toLowerCase();
        if (REVERSAL.test(status)) return sum;
        if (!REVENUE.test(status)) return sum;
        const n = Number(o.totalSum);
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);
      // Consider every tier that has AT LEAST ONE gate (either LTV or cart
      // amount). For each we check every configured gate — LTV against the
      // shopper's lifetime revenue, MIN_CART_AMOUNT against the current
      // `totalSum`. A tier is eligible only when EVERY gate it declares
      // passes. This unblocks tenants that ladder silver/gold/platinum by
      // cart size instead of LTV — the pre-fix filter dropped them entirely
      // because `ltvThreshold === null`.
      const tiersAll = (loyalty?.tiers ?? []).filter(
        (t) => typeof t.ltvThreshold === 'number' || typeof t.minCartAmount === 'number',
      );
      const isEligible = (t: typeof tiersAll[number]): boolean => {
        if (typeof t.ltvThreshold === 'number' && ltv < t.ltvThreshold) return false;
        if (typeof t.minCartAmount === 'number' && totalSum < t.minCartAmount) return false;
        return true;
      };
      let activeTier: typeof tiersAll[number] | null = null;
      for (let i = tiersAll.length - 1; i >= 0; i--) {
        if (isEligible(tiersAll[i])) { activeTier = tiersAll[i]; break; }
      }
      if (activeTier && activeTier.discountPct > 0) {
        let d = totalSum * (activeTier.discountPct / 100);
        if (activeTier.discountMaxAmount != null && d > activeTier.discountMaxAmount) {
          d = activeTier.discountMaxAmount;
        }
        discountAmount = Math.round(d * 100) / 100;
        totalSumWithDiscount = Math.max(0, totalSum - discountAmount);
        totalDue = Math.max(0, totalSumWithDiscount - bonusApplied);
      }
    }

    // Pull bonus constraints from OE's response so the UI can clamp the
    // "use N bonuses" input and hide the field when the cart doesn't
    // qualify. `discountConfig.bonus` holds per-order figures; the tenant
    // defaults in `.settings` are used as a fallback when OE omits a
    // specific field on this response.
    const dc = (obj.discountConfig ?? {}) as {
      bonus?: {
        availableBalance?: number;
        maxBonusDiscount?: number;
        minBonusAmount?: number | null;
        minOrderAmountForBonus?: number | null;
      };
      settings?: {
        minBonusAmount?: number | null;
        minOrderAmountForBonus?: number | null;
      };
    };
    const bonusCfg = dc.bonus ?? {};
    const bonusSettings = dc.settings ?? {};
    const bonus: PreviewBonusConfig = {
      availableBalance: Number(bonusCfg.availableBalance ?? 0),
      maxAmount: Number(bonusCfg.maxBonusDiscount ?? 0),
      minAmount: (typeof bonusCfg.minBonusAmount === 'number' ? bonusCfg.minBonusAmount
        : typeof bonusSettings.minBonusAmount === 'number' ? bonusSettings.minBonusAmount
        : null),
      minOrderAmount: (typeof bonusCfg.minOrderAmountForBonus === 'number' ? bonusCfg.minOrderAmountForBonus
        : typeof bonusSettings.minOrderAmountForBonus === 'number' ? bonusSettings.minOrderAmountForBonus
        : null),
    };

    return {
      ok: true, totalSum, totalSumWithDiscount, bonusApplied, totalDue,
      discountAmount,
      currency: String(obj.currency ?? input.currency ?? 'USD'),
      bonus,
      couponApplied,
      couponValidButNotApplied,
      couponReason,
      couponDiscountAmount,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error', missingProductIds: [] };
  }
}

export interface CreateOrderInput {
  /** Logical delivery method — actual storage marker is derived (suffixed
   *  with `_guest` when no session cookie is present). */
  storage: CheckoutMethod;
  paymentAccount: string;
  /** Payment account type from OE (`stripe` vs `custom`). When `stripe`, we
   *  spin up a Stripe checkout session after the order lands so the buyer
   *  gets a hosted paymentUrl to redirect to. */
  paymentAccountType?: 'stripe' | 'custom';
  products: Array<{ productId: number; quantity: number }>;
  formData?: Array<{ marker: string; type: string; value: unknown }>;
  currency?: string;
  /** Coupon code to apply. OE validates it server-side and folds the
   *  discount into `totalSumWithDiscount`. */
  couponCode?: string;
  /** Bonus points to burn — OE clamps to `min(balance, cap)`. */
  bonusAmount?: number;
  /** Required for guest checkout — uniquely identifies the anonymous visitor
   *  so OE attaches the order to a guest session. Generate once per browser
   *  via localStorage and pass through unchanged. */
  guestId?: string;
  /** Browser origin (e.g. `http://localhost:3002`). Used to build Stripe's
   *  success/cancel URLs so the buyer lands back on /checkout/confirmation
   *  instead of the OE merchant's default URL. */
  origin?: string;
}

const FORM_IDENTIFIER_MAP: Record<CheckoutMethod, string> = {
  home: 'checkout_home_delivery',
  store_pickup: 'checkout_store_pickup',
  locker: 'checkout_locker',
};

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<
  | { ok: true; orderId: number; paymentUrl: string | null; paymentSessionError?: string }
  | { ok: false; error: string }
> {
  if (!isOneEntryEnabled) return { ok: false, error: 'OneEntry env not configured' };

  const access = await readAccessOrRefresh();
  const isGuest = !access;
  const storageMarker = isGuest ? `${input.storage}_guest` : input.storage;
  const formIdentifier = isGuest
    ? `${FORM_IDENTIFIER_MAP[input.storage]}_guest`
    : FORM_IDENTIFIER_MAP[input.storage];

  // Mint a request-scoped SDK: user-authed if we have `access`, otherwise a
  // fresh guest instance with the guestId wired in via `getGuestApi`.
  let api: ReturnType<typeof getUserApi> = null;
  if (access) {
    api = getUserApi(access);
  } else if (input.guestId) {
    api = getGuestApi(input.guestId);
  } else {
    // Even a guest checkout needs a guestId — orders can't be attached to
    // an anonymous browser without one.
    api = getUserApi('');
  }
  if (!api) return { ok: false, error: 'OneEntry SDK not initialised' };

  try {
    // SDK expects `IOrderData` = { formIdentifier, paymentAccountIdentifier,
    // formData: IOrdersFormData | IOrdersFormData[], products, couponCode?,
    // additionalDiscountsMarkers?, bonusAmount? }. The SDK's `createOrder`
    // wraps the array in `{ [langCode]: [...] }` itself — pre-wrapping here
    // caused double-nesting and OE responded with "formData's marker
    // 'undefined' marker is required". Passing the plain array lets the SDK
    // do its single wrap correctly.
    const body: Record<string, unknown> = {
      formIdentifier,
      paymentAccountIdentifier: input.paymentAccount,
      formData: input.formData ?? [],
      products: input.products,
      currency: input.currency ?? 'USD',
    };
    if (input.couponCode) body.couponCode = input.couponCode;
    if (typeof input.bonusAmount === 'number' && input.bonusAmount > 0) body.bonusAmount = input.bonusAmount;
    // Mirror `previewOrderAction` — pass tier markers so OE has a chance to
    // apply the shopper's `PERSONAL_DISCOUNT` at order-creation time. OE
    // still validates conditions server-side; markers the shopper doesn't
    // qualify for are ignored.
    body.additionalDiscountsMarkers = [...TIER_MARKERS];
    const result = await api.Orders.createOrder(
      storageMarker,
      body as unknown as Parameters<typeof api.Orders.createOrder>[1],
      DEFAULT_LOCALE,
    );
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'createOrder failed' };
    }
    // SDK returns `IBaseOrdersEntity` which doesn't include `paymentUrl` in
    // typings — the real API adds it on legacy provider configs.
    const raw = result as unknown as { id?: number; paymentUrl?: string | null };
    const orderId = typeof raw.id === 'number' ? raw.id : Number(raw.id ?? 0);
    let paymentUrl = typeof raw.paymentUrl === 'string' ? raw.paymentUrl : null;
    let paymentSessionError: string | undefined;

    // Order placed — invalidate every ISR / `unstable_cache` surface that
    // may have gone stale as a result. Skip on payment-provider redirect
    // errors below since the order still landed in OE.
    try {
      // Product listing may show stock qty / status changes for the
      // items just purchased.
      revalidateTag('oe-products', 'max');
      // Discount rules can be single-use coupons or usage-capped tiers —
      // the applied one may just have consumed a slot.
      revalidateTag('oe-discounts', 'max');
    } catch { /* revalidateTag is a no-op outside a request context */ }

    if (!paymentUrl && orderId && input.paymentAccountType === 'stripe') {
      // Stripe-backed accounts: mint a Checkout session via SDK. The SDK's
      // `createSession` signature is `(orderId, type, automaticTaxEnabled)` —
      // it does not forward `successUrl` / `cancelUrl` to OE. The merchant's
      // default URL configured in OE admin is used. See SDK gap note in the
      // refactor report.
      try {
        const sessionResult = await api.Payments.createSession(orderId, 'session', false);
        if (isError(sessionResult)) {
          paymentSessionError = sessionResult.message ?? 'createSession failed';
          console.error('[createOrderAction] Stripe session creation failed:', paymentSessionError);
        } else {
          const raw = sessionResult as unknown as { paymentUrl?: unknown };
          if (typeof raw.paymentUrl === 'string') paymentUrl = raw.paymentUrl;
        }
      } catch (err) {
        paymentSessionError = err instanceof Error ? err.message : 'Network error';
        console.error('[createOrderAction] Stripe session network error:', paymentSessionError);
      }
    }
    return { ok: true, orderId, paymentUrl, paymentSessionError };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
