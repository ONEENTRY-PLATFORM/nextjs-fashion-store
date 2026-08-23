/** Shopper-scoped OneEntry calls (profile, orders, cart, wishlist, checkout). */
import type {
  FormDataType,
  IAuthFormData,
  IAuthProvidersEntity,
  IBaseOrdersEntity,
  IBonusBalanceEntity,
  ICartItem,
  ICartResponse,
  ICreateOrderPreview,
  IDiscountsEntity,
  IDiscountValue,
  IFormByMarkerDataEntity,
  IFormsByMarkerDataEntity,
  IOrderByMarkerEntity,
  IOrderData,
  IOrderDiscountBonus,
  IOrderDiscountConfig,
  IOrderDiscountSettings,
  IOrderProductData,
  IOrderProducts,
  IOrdersByMarkerEntity,
  IOrdersFormData,
  IUserBody,
  IUserEntity,
  IWishlistItem,
  IWishlistResponse,
} from 'oneentry/types';

import { getProductPreviewsAction } from '@/lib/oneentry/catalog/product-previews-action';
import { SAVED_ADDRESS_FORM } from '@/lib/oneentry/checkout/forms';
import { fieldByRole, type FieldRole, markerForRole, soleFieldOfType } from '@/lib/oneentry/forms/field-lookup';
import type { FormContent } from '@/lib/oneentry/forms/form-content';
import { formDataValue, hasMarker } from '@/lib/oneentry/forms/form-data-entry';
import { loadFormContentForLang } from '@/lib/oneentry/forms/load-form';
import {
  clearTokens,
  getApiSafe,
  getAuthProviderMarker,
  getLang,
  hasStoredSession,
  isError,
  isOneEntryEnabled,
  storeSession,
} from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { localizedTitle, type MaybeLocalizedInfo } from '@/lib/oneentry/localize';
import { isOnlinePaymentAccount, type PaymentAccountType } from '@/lib/oneentry/payments/account-type';
import { se } from '@/lib/oneentry/server-errors';
import type { Lang } from '@/lib/oneentry/system-text';

import { readRefreshToken, readUserIdentifier, writeUserIdentifier } from './browser-session';
import { pickImage, type RawPicture } from './pick-image';
import { revalidateAfterOrderAction } from './revalidate-action';

const SIGNUP_FORM_IDENTIFIER = 'signin';

/** One field of the sign-in form, as sent to `signUp` / `PUT /me`. ⚠️ `IAuthFormData` types `value` as `string`, but OE requires an array on `list` attributes (gender) and rejects a bare string there. */
type SignInFormData = Omit<IAuthFormData, 'value'> & { value: string | string[] };

/** Auth-provider marker for the e-mail/password flow on this tenant. */
const AUTH_MARKER = 'email';

/** Auth-provider marker for Google sign-in on this tenant. */
const GOOGLE_AUTH_MARKER = 'google';

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

/** Aliased to the SDK's own cart/wishlist item types so a change on the OE side lands here instead of drifting silently. */
export type OeCartItem = ICartItem;
export type OeWishlistItem = IWishlistItem;

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
  /** Human-readable status title from OE `statusLocalizeInfos.title`. */
  statusTitle: string;
  totalSum: string;
  currency: string;
  createdDate?: string;
  products: OeOrderProduct[];
  formData: Record<string, unknown>;
}

export interface OeUserState {
  /** Recently viewed product IDs with timestamps — order: index 0 is most recent. */
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
  /** loyalty state resolved from OE `Discounts` on `/me` bootstrap. */
  loyalty: OeLoyalty | null;
}

/** One rung of the OE loyalty ladder. */
export interface OeLoyaltyTier {
  tier: string;
  tierTitle: string;
  discountPct: number;
  discountMaxAmount: number | null;
  applicability: string;
  /** LTV threshold to qualify (from `conditions[type=USER_LTV].value.amount`). */
  ltvThreshold: number | null;
  /** Cart-total threshold from `conditions[type=MIN_CART_AMOUNT].value.amount`. Some tenants ladder personal-discount rungs by cart size (silver at $500, gold at $1000, …) instead of user lifetime value. */
  minCartAmount: number | null;
  /** OE user-group ids the tier belongs to (`userGroups[].id`). */
  userGroupIds: number[];
}

export interface OeLoyalty {
  /** All tier configs OE knows about (sorted ascending by LTV threshold). */
  tiers: OeLoyaltyTier[];
  /** Aggregate bonus balance across all bonus types. */
  bonusBalance: number;
}

// Session state lives in the SDK singleton (access + refresh tokens) and in localStorage (`refresh-token`, `authProviderMarker`, `oe_user_identifier`).

const DEFAULT_SUBSCRIPTIONS: OeSubscriptions = {
  emailNewsletter: false,
  smsNotifications: false,
  pushNotifications: false,
  orderUpdates: false,
  newArrivals: false,
  saleAlerts: false,
  loyaltyUpdates: false,
};

// User-scoped order storages (non-guest). Probed via Orders.getAllOrdersStorage.
const USER_ORDER_STORAGE_MARKERS = ['home', 'store_pickup', 'locker'] as const;

async function fetchUserOrders(): Promise<OeOrder[]> {
  const api = getApiSafe();
  if (!api) return [];
  /** `IOrderProducts` with `previewImage` widened: it also arrives as an array, and its `previewLink` is not always a string. */
  type RawProduct = Partial<Omit<IOrderProducts, 'previewImage'>> & {
    previewImage?: RawPicture | RawPicture[] | null;
  };
  /** `IOrderByMarkerEntity` as it ships: fields can be missing, and `statusLocalizeInfos` arrives flat or wrapped per locale. */
  type RawOrder = Partial<Omit<IOrderByMarkerEntity, 'statusLocalizeInfos' | 'products'>> & {
    statusLocalizeInfos?: MaybeLocalizedInfo;
    products?: RawProduct[];
  };
  const all: OeOrder[] = [];
  await Promise.all(
    USER_ORDER_STORAGE_MARKERS.map(async (marker) => {
      try {
        const result = await api.Orders.getAllOrdersByMarker(marker, getLang(), 0, 100);
        if (isError(result)) return;
        const data: Omit<IOrdersByMarkerEntity, 'items'> & { items?: RawOrder[] } = result;
        for (const o of data.items ?? []) {
          const formDataMap: Record<string, unknown> = {};
          for (const f of o.formData ?? []) {
            if (f.marker) formDataMap[f.marker] = f.value;
          }
          // Extract status title from either shape OE ships: flat: `{ title: "In Progress" }` wrapped: `{ en_US: { title: "In Progress" } }`
          const sli = o.statusLocalizeInfos;
          const flatTitle =
            sli && typeof (sli as { title?: unknown }).title === 'string' ? (sli as { title: string }).title : '';
          const wrappedTitle =
            sli && !flatTitle
              ? String(
                  ((sli as Record<string, { title?: unknown }>)[getLang()]?.title ??
                    Object.values(sli as Record<string, { title?: unknown }>)[0]?.title ??
                    '') ||
                    '',
                )
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

  // OE frequently returns `previewImage: null` for products embedded in an order (the snapshot doesn't inline the picture entity).
  const missingIds = new Set<number>();
  for (const o of all) {
    for (const p of o.products) {
      if (!p.image && p.id > 0) missingIds.add(p.id);
    }
  }
  if (missingIds.size > 0) {
    // Catalogue reads are public + cached, so they stay on the server behind a Server Action instead of costing every shopper an uncached SDK call.
    const catalog = await getProductPreviewsAction(Array.from(missingIds));
    const imageMap = new Map<number, string>();
    for (const c of catalog) {
      imageMap.set(c.id, c.preview);
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

/** Loyalty tier markers configured on this OE tenant, ascending by prestige. */
const TIER_MARKERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

async function fetchLoyalty(): Promise<OeLoyalty | null> {
  const api = getApiSafe();
  if (!api) return null;

  // Fetch every tier in parallel via SDK `Discounts.getDiscountByMarker` and the bonus balance via `Discounts.getBonusBalance`. The SDK normalises localizeInfos + fields for us, so downstream code sees a clean shape.
  const [rawTiers, bonusResult] = await Promise.all([
    Promise.all(TIER_MARKERS.map((m) => api.Discounts.getDiscountByMarker(m, getLang()))),
    api.Discounts.getBonusBalance(),
  ]);

  /** `IDiscountsEntity` with the two fields the API contradicts: `IDiscountCondition.value` is declared a string but USER_LTV returns `{ amount: 100 }`, and `localizeInfos` arrives flat or wrapped per locale. */
  type RawDiscount = Omit<Partial<IDiscountsEntity>, 'conditions' | 'localizeInfos'> & {
    localizeInfos?: MaybeLocalizedInfo;
    conditions?: Array<{ conditionType?: string; type?: string; value?: { amount?: number } | string }>;
  };

  const tiers: OeLoyaltyTier[] = rawTiers
    .filter((r) => !isError(r))
    .map((r) => r as RawDiscount)
    .filter((r) => !!r.identifier)
    .map((r): OeLoyaltyTier => {
      const dv: Partial<IDiscountValue> = r.discountValue ?? {};
      const isPercent =
        (dv.discountType ?? '').toUpperCase() === 'PERCENTAGE' || (dv.discountType ?? '').toUpperCase() === 'PERCENT';
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
      const ltvCond = (r.conditions ?? []).find((c) => c.conditionType === 'USER_LTV' || c.type === 'USER_LTV');
      const minCartCond = (r.conditions ?? []).find(
        (c) => c.conditionType === 'MIN_CART_AMOUNT' || c.type === 'MIN_CART_AMOUNT',
      );
      const ltvValue = readAmount(ltvCond);
      const minCartValue = readAmount(minCartCond);
      const groupsRaw = Array.isArray(r.userGroups) ? r.userGroups : [];
      return {
        tier: r.identifier ?? '',
        // `DEFAULT_LOCALE` is `en_US`, which is the locale this lookup always read; the helper adds the flat-shape fallback it already had.
        tierTitle: localizedTitle(r.localizeInfos, DEFAULT_LOCALE),
        discountPct: isPercent ? Number(dv.value ?? 0) : 0,
        discountMaxAmount: dv.maxAmount ?? null,
        applicability: dv.applicability ?? '',
        ltvThreshold: ltvValue,
        minCartAmount: minCartValue,
        userGroupIds: groupsRaw.map((g) => Number(g?.id ?? 0)).filter((n) => n > 0),
      };
    })
    // Sort by ascending "effective threshold" so higher rungs land later.
    .sort((a, b) => {
      const at = a.ltvThreshold ?? a.minCartAmount ?? -1;
      const bt = b.ltvThreshold ?? b.minCartAmount ?? -1;
      return at - bt;
    });

  // Declared as a single `IBonusBalanceEntity`; the endpoint answers with an array of them depending on how the tenant sliced things.
  let balance = 0;
  if (!isError(bonusResult)) {
    const raw = bonusResult as Partial<IBonusBalanceEntity> | Array<Partial<IBonusBalanceEntity>>;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    balance = list.reduce((sum, b) => sum + Number(b?.balance ?? 0), 0);
  }

  // Return the object even when `tiers` is empty.
  return {
    tiers,
    bonusBalance: Number.isFinite(balance) ? balance : 0,
  };
}

async function fetchMe(): Promise<OeUser | null> {
  /** `IUserEntity` as it ships: fields can be missing, `formData` arrives flat or wrapped per locale, and `state` is typed here rather than left as `Record<string, unknown>`. */
  type RawMe = Partial<Omit<IUserEntity, 'formData' | 'state'>> & {
    formData?: FormDataType[] | Record<string, FormDataType[]>;
    state?: OeUserState;
  };

  const api = getApiSafe();
  if (!api) return null;

  const [meResult, cartResult, wishlistResult, addrRecords, userDataRec, subsRec, orders, loyalty] = await Promise.all([
    api.Users.getUser(getLang()),
    api.Users.getCart(),
    api.Users.getWishlist(),
    fetchUserAddresses(),
    fetchUserDataRecord(),
    fetchSubsRecord(),
    fetchUserOrders(),
    fetchLoyalty(),
  ]);
  if (isError(meResult)) return null;
  // SDK `IUserEntity.formData` is strictly `FormDataType[]` but OE's raw /me response may ship either a flat array or `{ en_US: [...] }` depending on locale slicing.
  const data = meResult as RawMe;
  const cart: ICartResponse | null = isError(cartResult) ? null : cartResult;
  const wishlist: IWishlistResponse | null = isError(wishlistResult) ? null : wishlistResult;

  // formData may be flat array or { lang: array }
  const arr = Array.isArray(data.formData) ? data.formData : (data.formData?.en_US ?? []);
  const formDataMap: Record<string, unknown> = {};
  for (const item of arr) {
    // `FormDataType`'s catch-all member is a bare `Record<string, unknown>`, so the marker has to be proven present before it can key the map.
    if (hasMarker(item)) formDataMap[item.marker] = item.value;
  }
  const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
  const asGender = (v: unknown): string | undefined => {
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return asString(v);
  };
  const radioBool = (v: unknown): boolean => v === 'true' || v === true;

  const state: OeUserState = data.state ?? {};
  // Subscriptions come exclusively from the `subscription_management` form (email/sms) and the sign-in formData for the two boolean flags.
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

  // Profile extras + consent come exclusively from the `user_data` form record — no more `state.profile` / `state.consent` fallback.
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

async function readStateFromMe(): Promise<OeUserState> {
  const api = getApiSafe();
  if (!api) return {};
  const result = await api.Users.getUser(getLang());
  if (isError(result)) return {};
  // SDK `IUserEntity.state` is `Record<string, unknown>`; our narrower OeUserState is structurally compatible for the read path.
  return (result.state ?? {}) as OeUserState;
}

// ── Form-data helpers (SDK-backed under user accessToken) ────────────────────

/** SDK-backed GET-list for a form marker. */
async function formDataGetByMarker(
  marker: string,
  formModuleConfigId: number,
  body: object,
  limit = 100,
): Promise<{ items?: RawFormRecord[]; total?: number } | null> {
  const api = getApiSafe();
  if (!api) return null;
  try {
    // Form-data records are stored in a locale-keyed bag, and every read/write in this file pins the same canonical slot.
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
    // SDK typing narrows formData; the raw response tolerates both wrapped and flat variants and our RawFormRecord shape reflects that.
    const data: Omit<IFormsByMarkerDataEntity, 'items'> & { items?: RawFormRecord[] } = result;
    return data;
  } catch {
    return null;
  }
}

interface FdSuccess<T> {
  ok: true;
  data: T;
}
interface FdError {
  ok: false;
  status: number;
  message: string;
}

/** SDK-backed POST of a new form-data record. */
async function formDataPost<T>(body: {
  formIdentifier: string;
  formModuleConfigId: number;
  moduleEntityIdentifier: string;
  replayTo: string | null;
  status: string;
  formData: unknown;
}): Promise<FdSuccess<T> | FdError> {
  const api = getApiSafe();
  if (!api) return { ok: false, status: 0, message: await se('sdkNotInitialised') };
  try {
    // SDK's postFormsData internally wraps `formData` in { [langCode]: [...] } if given a flat array.
    const raw = body.formData;
    const flat =
      raw && !Array.isArray(raw) && typeof raw === 'object' && DEFAULT_LOCALE in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>)[DEFAULT_LOCALE]
        : raw;
    const result = await api.FormData.postFormsData(
      {
        ...body,
        formData: flat as FormDataType[],
      },
      DEFAULT_LOCALE,
    );
    if (isError(result)) {
      return { ok: false, status: 0, message: result.message ?? 'postFormsData failed' };
    }
    return { ok: true, data: result as unknown as T };
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : await se('network') };
  }
}

/** SDK-backed PUT of an existing form-data record by id. */
async function formDataPut<T>(id: number, body: object): Promise<T | null> {
  const api = getApiSafe();
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
async function formDataDelete(id: number): Promise<boolean> {
  const api = getApiSafe();
  if (!api) return false;
  try {
    const result = await api.FormData.deleteFormsDataByid(id);
    if (isError(result)) return false;
    return result === true;
  } catch {
    return false;
  }
}

/** `IFormByMarkerDataEntity` with the one shape it does not describe: `formData` arrives either as a flat array or as `{ en_US: [...] }` depending on the endpoint. */
type RawFormRecord = Omit<IFormByMarkerDataEntity, 'formData'> & {
  formData?: FormDataType[] | Record<string, FormDataType[]>;
};

const formDataArray = (rec: RawFormRecord, lang: string = DEFAULT_LOCALE): FormDataType[] => {
  const fd = rec.formData;
  if (Array.isArray(fd)) return fd;
  if (fd && typeof fd === 'object') return fd[lang] ?? [];
  return [];
};

const fieldValue = (rec: RawFormRecord, marker: string | undefined): string => {
  if (!marker) return '';
  const v = formDataValue(formDataArray(rec), marker);
  return typeof v === 'string' ? v : '';
};

/** Load the saved-address form, for its field markers. */
async function savedAddressForm(): Promise<FormContent> {
  return loadFormContentForLang(SAVED_ADDRESS_FORM, DEFAULT_LOCALE as Lang);
}

/** Decode one saved-address record. */
function recordToAddress(rec: RawFormRecord, form: FormContent): OeAddress {
  const read = (role: FieldRole) => fieldValue(rec, markerForRole(form, role));
  const name = read('label') || 'Address';
  const fullName = read('fullName');
  const phone = read('phone');
  const line1 = read('line1');
  const city = read('city');
  const postcode = read('postcode');
  const instructions = read('instructions');
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

/** Encode an address back into OE form data. */
function addressToFormData(address: OeAddress, form: FormContent): FormDataType[] {
  const out: FormDataType[] = [];
  // The record id is the form's only `integer` attribute — a bookkeeping field with no shopper-facing role to tag.
  const idField = soleFieldOfType(form, 'integer');
  if (idField) out.push({ marker: idField.marker, type: idField.type, value: address.recordId ?? Date.now() });
  const write = (role: FieldRole, value: string) => {
    const field = fieldByRole(form, role);
    if (field) out.push({ marker: field.marker, type: field.type, value });
  };
  write('label', address.name);
  write('fullName', address.fullName);
  write('phone', address.phone);
  write('line1', address.line1);
  write('city', address.city);
  write('postcode', address.postcode);
  write('instructions', address.instructions ?? '');
  return out;
}

async function fetchUserAddresses(): Promise<OeAddress[]> {
  const [result, form] = await Promise.all([
    formDataGetByMarker(SAVED_ADDRESS_FORM, USER_ADDRESSES_MODULE_CONFIG_ID, {}, 100),
    savedAddressForm(),
  ]);
  return (result?.items ?? []).map((rec) => recordToAddress(rec, form));
}

async function postUserAddress(
  userIdentifier: string,
  address: OeAddress,
): Promise<{ ok: true; record: RawFormRecord } | { ok: false; message: string }> {
  type PostResponse = RawFormRecord & { formData?: RawFormRecord; actionMessage?: string };
  const res = await formDataPost<PostResponse>({
    formIdentifier: SAVED_ADDRESS_FORM,
    formModuleConfigId: USER_ADDRESSES_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: addressToFormData(address, await savedAddressForm()) },
  });
  if (!res.ok) return { ok: false, message: res.message };
  // POST may respond either as a flat record `{id, formData[], ...}` or wrapped as `{formData: {id, formData[], ...}, actionMessage}` depending on the form.
  const flat = res.data;
  const wrapped =
    flat.formData && typeof flat.formData === 'object' && !Array.isArray(flat.formData)
      ? (flat.formData as RawFormRecord)
      : flat;
  return { ok: true, record: wrapped };
}

async function putUserAddress(recordId: number, address: OeAddress): Promise<boolean> {
  const result = await formDataPut<unknown>(recordId, {
    langCode: DEFAULT_LOCALE,
    formData: addressToFormData(address, await savedAddressForm()),
  });
  return result !== null;
}

async function deleteUserAddress(recordId: number): Promise<boolean> {
  return formDataDelete(recordId);
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

async function fetchUserDataRecord(): Promise<{ recordId: number | null; extras: UserDataExtras }> {
  const result = await formDataGetByMarker('user_data', USER_DATA_MODULE_CONFIG_ID, {}, 10);
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

function userDataToFormData(extras: UserDataExtras): FormDataType[] {
  const out: FormDataType[] = [];
  if (extras.lastName !== undefined) out.push({ marker: 'user_last_name', type: 'string', value: extras.lastName });
  if (extras.dob !== undefined) out.push({ marker: 'user_birthday', type: 'date', value: extras.dob });
  if (extras.shoeSize !== undefined && extras.shoeSize !== '') {
    const n = parseFloat(extras.shoeSize);
    if (Number.isFinite(n)) out.push({ marker: 'user_shoes_size', type: 'float', value: n });
  }
  if (extras.clothingSize !== undefined)
    out.push({ marker: 'user_clothing_size', type: 'string', value: extras.clothingSize });
  if (extras.consentDataProcessing !== undefined) {
    out.push({
      marker: 'user_consent_for_personal_data_processing',
      type: 'radioButton',
      value: extras.consentDataProcessing ? 'true' : 'false',
    });
  }
  if (extras.consentCrossBorder !== undefined) {
    out.push({
      marker: 'user_consent_for_cross-border_data_transfer',
      type: 'radioButton',
      value: extras.consentCrossBorder ? 'true' : 'false',
    });
  }
  return out;
}

async function upsertUserDataRecord(userIdentifier: string, patch: UserDataExtras): Promise<boolean> {
  const current = await fetchUserDataRecord();
  const merged: UserDataExtras = { ...current.extras, ...patch };
  const formData = userDataToFormData(merged);

  if (current.recordId) {
    const result = await formDataPut<unknown>(current.recordId, { langCode: DEFAULT_LOCALE, formData });
    return result !== null;
  }

  // No existing record.
  const { dob: _dropDob, ...patchWithoutDob } = merged;
  void _dropDob;
  const postData = userDataToFormData(patchWithoutDob);
  type PostResponse = RawFormRecord & { formData?: RawFormRecord };
  const created = await formDataPost<PostResponse>({
    formIdentifier: 'user_data',
    formModuleConfigId: USER_DATA_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: postData },
  });
  if (!created.ok) return false;
  const rec = created.data;
  const newId =
    rec.formData && typeof rec.formData === 'object' && !Array.isArray(rec.formData)
      ? (rec.formData as RawFormRecord).id
      : rec.id;
  if (!newId) return true;
  if (merged.dob) {
    const result = await formDataPut<unknown>(newId, { langCode: DEFAULT_LOCALE, formData });
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

async function fetchSubsRecord(): Promise<{ recordId: number | null; extras: SubsExtras }> {
  const result = await formDataGetByMarker('subscription_management', SUBSCRIPTION_MGMT_MODULE_CONFIG_ID, {}, 10);
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

function subsToFormData(extras: SubsExtras): FormDataType[] {
  const bool = (
    k:
      | 'emailNewsletter'
      | 'smsNotifications'
      | 'pushNotifications'
      | 'orderUpdates'
      | 'newArrivals'
      | 'saleAlerts'
      | 'loyaltyUpdates',
  ): string => (extras[k] ? 'true' : 'false');
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

async function upsertSubsRecord(userIdentifier: string, subs: OeSubscriptions): Promise<boolean> {
  const current = await fetchSubsRecord();
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
    const result = await formDataPut<unknown>(current.recordId, { langCode: DEFAULT_LOCALE, formData });
    return result !== null;
  }
  const result = await formDataPost<RawFormRecord>({
    formIdentifier: 'subscription_management',
    formModuleConfigId: SUBSCRIPTION_MGMT_MODULE_CONFIG_ID,
    moduleEntityIdentifier: userIdentifier,
    replayTo: null,
    status: 'sent',
    formData: { en_US: formData },
  });
  return result.ok;
}

/**
 * `IUserBody`, with the two shapes the call sites here actually pass: `formData` sometimes still
 * wrapped as `{ en_US: [...] }` (unwrapped below — the SDK takes only a single `IAuthFormData` or
 * an array), and `state` as the narrower `OeUserState`, which is a `Record<string, unknown>` in all
 * but the index signature TypeScript wants.
 */
type PutUserBody = Omit<IUserBody, 'formData' | 'state'> & {
  formData?: IUserBody['formData'] | Record<string, IAuthFormData[]> | SignInFormData[];
  state?: OeUserState | Record<string, unknown>;
};

async function putUser(body: PutUserBody): Promise<boolean> {
  const api = getApiSafe();
  if (!api) return false;
  const { formData: fd, state, ...rest } = body;
  // A single `IAuthFormData` is not an array either, but it has no locale key, so it falls through untouched.
  const wrapped = fd && !Array.isArray(fd) && DEFAULT_LOCALE in fd ? (fd as Record<string, IAuthFormData[]>) : null;
  const normalized: IUserBody = {
    ...rest,
    ...(state ? { state: state as Record<string, unknown> } : {}),
    // `SignInFormData` widens `IAuthFormData.value` to `string | string[]`: OE accepts an array for multi-value markers, the SDK type does not say so.
    ...(fd ? { formData: (wrapped ? wrapped[DEFAULT_LOCALE] : fd) as IAuthFormData[] } : {}),
  };
  const result = await api.Users.updateUser(normalized, DEFAULT_LOCALE);
  return result === true;
}
void DEFAULT_SUBSCRIPTIONS;

/** Auth provider descriptor pulled from OE. */
export interface AuthProviderInfo {
  /** Provider marker — `'email'`, `'google'`, `'apple'`, `'facebook'`, … */
  identifier: string;
  /** Provider kind — matches identifier for most social providers. */
  type: string;
  /** Human title from OE localizeInfos.en_US.title, falls back to identifier. */
  title: string;
  /** Form marker to load field schema (only meaningful for form-based auth). */
  formIdentifier?: string;
  /** Whether OE requires post-signup activation via `activateUser()`. */
  isCheckCode: boolean;
  /** Length of the one-time code OE mints for this provider (`config.systemCodeLength`). */
  codeLength: number | null;
  /** Seconds a minted code stays valid (`config.systemCodeTlsSec` — OE's own spelling of "TTL sec"). */
  codeTtlSec: number | null;
}

/** `IAuthProvidersEntity` as it ships: fields can be missing, `localizeInfos` arrives flat or wrapped per locale, and the code counters come back as numbers although the config declares them strings. */
interface RawAuthProvider extends Partial<Omit<IAuthProvidersEntity, 'config' | 'localizeInfos'>> {
  config?: Partial<Record<keyof IAuthProvidersEntity['config'], number | string | null>>;
  localizeInfos?: MaybeLocalizedInfo;
}

/** Coerce one of OE's numeric-ish config counters to a usable number. */
function positiveNumber(raw: number | string | null | undefined): number | null {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

/** Return the list of authorization providers configured for the tenant. */
export async function getAuthProvidersAction(): Promise<AuthProviderInfo[]> {
  const api = getApiSafe();
  if (!api) return [];
  try {
    // Locale from the live SDK instance, not a literal: the shopper may be on `de_DE`, and a hardcoded key would silently serve English button copy.
    const lang = getLang();
    const result = await api.AuthProvider.getAuthProviders(lang);
    if (isError(result)) return [];
    const list = Array.isArray(result) ? (result as RawAuthProvider[]) : [];
    return list
      .filter(
        (p): p is RawAuthProvider & { identifier: string } =>
          typeof p?.identifier === 'string' && p.identifier.length > 0,
      )
      .map((p) => {
        const info = p.localizeInfos ?? {};
        // OE returns either language-keyed ({ de_DE: { title } }) or already flattened against the requested locale ({ title }) — accept both.
        const localized = (info as Record<string, { title?: string } | undefined>)[lang];
        const title =
          (typeof localized === 'object' && localized?.title) || (info as { title?: string }).title || p.identifier;
        return {
          identifier: p.identifier,
          type: typeof p.type === 'string' ? p.type : p.identifier,
          title,
          formIdentifier: typeof p.formIdentifier === 'string' ? p.formIdentifier : undefined,
          isCheckCode: p.isCheckCode === true,
          codeLength: positiveNumber(p.config?.systemCodeLength),
          codeTtlSec: positiveNumber(p.config?.systemCodeTlsSec),
        };
      });
  } catch {
    return [];
  }
}

/** Sign the shopper in with e-mail + password. */
export async function signInAction(login: string, password: string): Promise<AuthResult> {
  const api = getApiSafe();
  if (!api) {
    return { ok: false, error: await se('oneEntryNotConfigured') };
  }
  try {
    const result = await api.AuthProvider.auth(AUTH_MARKER, {
      authData: [
        { marker: 'email', value: login.trim() },
        { marker: 'password', value: password },
      ],
    });
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('signInFailed')) };
    }
    storeSession(result, AUTH_MARKER);
    writeUserIdentifier(result.userIdentifier);
    const user = await fetchMe();
    return { ok: true, userIdentifier: result.userIdentifier, user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('signInFailed') };
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

/** Register a new shopper. */
export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const api = getApiSafe();
  if (!api) {
    return { ok: false, error: await se('oneEntryNotConfigured') };
  }
  const email = input.email.trim();
  // OneEntry value formats vary per attribute type: string → string list → string[] (the option marker) radioButton → string
  const formData: SignInFormData[] = [
    { marker: 'first_name', type: 'string', value: input.firstName.trim() },
    { marker: 'phone', type: 'string', value: input.phone.trim() },
  ];
  if (input.gender) {
    formData.push({ marker: 'gender', type: 'list', value: [input.gender] });
  }
  if (input.subscribeEmail !== undefined) {
    formData.push({
      marker: 'users_subscribe_to_promotional_email',
      type: 'radioButton',
      value: input.subscribeEmail ? 'true' : 'false',
    });
  }
  if (input.subscribeSms !== undefined) {
    formData.push({
      marker: 'users_subscribe_to_promotional_sms',
      type: 'radioButton',
      value: input.subscribeSms ? 'true' : 'false',
    });
  }
  if (input.agreed) {
    formData.push({ marker: 'users_agree', type: 'radioButton', value: 'true' });
  }
  try {
    const signUpRes = await api.AuthProvider.signUp(AUTH_MARKER, {
      formIdentifier: SIGNUP_FORM_IDENTIFIER,
      authData: [
        { marker: 'email', value: email },
        { marker: 'password', value: input.password },
      ],
      // `SignInFormData` widens `IAuthFormData.value` to `string | string[]`: OE accepts an array for multi-value markers, the SDK type does not say so.
      formData: formData as IAuthFormData[],
      notificationData: {
        email,
        phonePush: input.phone.trim() ? [input.phone.trim()] : [],
        phoneSMS: input.phone.trim() || undefined,
      },
    });
    if (isError(signUpRes)) {
      return { ok: false, error: signUpRes.message ?? (await se('signUpFailed')) };
    }
    // No activation flow (isCheckCode=false) — log in right away.
    return await signInAction(email, input.password);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('signUpFailed') };
  }
}

/** Finish the Google OAuth round-trip in the browser. */
export async function completeGoogleSignIn(ctx: {
  code: string;
  state: string;
  origin: string;
}): Promise<AuthResult & { returnTo?: string }> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryNotConfigured') };

  const { exchangeGoogleCodeAction } = await import('./oauth-actions');
  const exchanged = await exchangeGoogleCodeAction({
    ...ctx,
    deviceMetadata: api.AuthProvider.getDeviceMetadata(),
  });
  if (!exchanged.ok) return { ok: false, error: exchanged.error };

  storeSession(exchanged, GOOGLE_AUTH_MARKER);
  writeUserIdentifier(exchanged.userIdentifier);
  const user = await fetchMe();
  return {
    ok: true,
    userIdentifier: exchanged.userIdentifier,
    user,
    returnTo: exchanged.returnTo,
  };
}

/** End the shopper's session. */
export async function signOutAction(): Promise<{ ok: boolean }> {
  const api = getApiSafe();
  const refresh = readRefreshToken();
  if (api && refresh) {
    try {
      await api.AuthProvider.logout(getAuthProviderMarker(), refresh);
    } catch {
      /* ignore — the local token reset below is the source of truth */
    }
  }
  writeUserIdentifier('');
  clearTokens();
  return { ok: true };
}

/** Move an order into the tenant's cancellation status. */
export async function cancelOrderAction(
  orderId: number,
  storage: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOneEntryEnabled) return { ok: false, error: await se('oneEntryNotConfigured') };
  if (!orderId || !storage) return { ok: false, error: await se('missingOrderId') };
  if (!hasStoredSession()) return { ok: false, error: await se('notSignedIn') };
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('sdkNotInitialised') };
  try {
    // 1.
    const existing = await api.Orders.getOrderByMarkerAndId(storage, orderId, DEFAULT_LOCALE);
    if (isError(existing)) return { ok: false, error: existing.message ?? `HTTP ${existing.statusCode}` };
    // Read and write shapes differ: the read returns products as `IOrderProducts` (`{ id, … }`), the update expects `{ productId, quantity }`. `currency`, `couponCode` and `bonusAmount` round-trip through the order but are not on `IOrderByMarkerEntity`.
    const cur = existing as Partial<Omit<IOrderByMarkerEntity, 'products'>> & {
      products?: Array<Partial<IOrderProducts> & { productId?: number }>;
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

    // 2.
    let cancelledMarker = '';
    // Also pinned: this list is matched against, not shown.
    const statuses = await api.Orders.getAllStatusesByStorageMarker(storage, DEFAULT_LOCALE, 0, 100);
    if (!isError(statuses) && Array.isArray(statuses)) {
      const match = statuses.find((s) => {
        const info = s as { identifier?: string; localizeInfos?: { title?: string } };
        return /cancel/i.test(info.identifier ?? '') || /cancel/i.test(info.localizeInfos?.title ?? '');
      });
      if (match) cancelledMarker = (match as { identifier?: string }).identifier ?? '';
    }
    if (!cancelledMarker) cancelledMarker = `${storage}_cancelled`;

    // 3. `currency` and `statusIdentifier` are accepted by the endpoint but absent from `IOrderData`.
    const body: IOrderData & { currency?: string; statusIdentifier?: string } = {
      formIdentifier: cur.formIdentifier ?? '',
      paymentAccountIdentifier: cur.paymentAccountIdentifier ?? '',
      formData: cur.formData ?? [],
      products: productsForUpdate,
      statusIdentifier: cancelledMarker,
    };
    if (cur.currency) body.currency = cur.currency;
    if (cur.couponCode) body.couponCode = cur.couponCode;
    if (typeof cur.bonusAmount === 'number') body.bonusAmount = cur.bonusAmount;

    const result = await api.Orders.updateOrderByMarkerAndId(storage, orderId, body, DEFAULT_LOCALE);
    if (isError(result)) return { ok: false, error: result.message ?? `HTTP ${result.statusCode}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network') };
  }
}

/** Bonus-programme transaction. */
export interface OeBonusTransaction {
  amount: number;
  /** OE marker — `ACCRUAL` | `USAGE` | `REDUCE` | `REVERSAL_ACCRUAL` | `REVERSAL_USAGE` | `EXPIRATION`. */
  type: string;
  createdAt: string | null;
  comment: string | null;
  sign: 1 | -1;
}

const POSITIVE_BONUS_TYPES = new Set(['ACCRUAL', 'REVERSAL_USAGE']);

export async function fetchBonusHistoryAction(): Promise<OeBonusTransaction[]> {
  if (!isOneEntryEnabled) return [];
  if (!hasStoredSession()) return [];
  const api = getApiSafe();
  if (!api) return [];
  try {
    const result = await api.Discounts.getBonusHistory();
    if (isError(result)) return [];
    // OE returns `{ items, total }` (paginated), not a bare array as the SDK types suggest.
    const list: unknown[] = Array.isArray(result)
      ? (result as unknown[])
      : Array.isArray((result as { items?: unknown[] })?.items)
        ? (result as { items: unknown[] }).items
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

/** Hydrate `/me` for the current session. */
export async function getCurrentUserAction(): Promise<OeUser | null> {
  if (!hasStoredSession()) return null;
  const me = await fetchMe();
  if (me) return me;
  // Refresh token is dead (or the account vanished) — drop it so the next load doesn't repeat the failing `/refresh`.
  clearTokens();
  writeUserIdentifier('');
  return null;
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

export async function updateProfileAction(patch: ProfileUpdate): Promise<{ ok: boolean; error?: string }> {
  if (!hasStoredSession()) return { ok: false, error: await se('notAuthenticated') };
  const userIdentifier = readUserIdentifier();

  // 1) Fields living in the sign-in form (PUT /me)
  const formData: SignInFormData[] = [];
  if (patch.firstName !== undefined) formData.push({ marker: 'first_name', type: 'string', value: patch.firstName });
  if (patch.phone !== undefined) formData.push({ marker: 'phone', type: 'string', value: patch.phone });
  if (patch.gender !== undefined) formData.push({ marker: 'gender', type: 'list', value: [patch.gender] });
  let signinOk = true;
  if (formData.length > 0) {
    signinOk = await putUser({ formIdentifier: SIGNUP_FORM_IDENTIFIER, formData });
  }

  // 2) Profile extras live in the user_data form-data record
  const extrasPatch: UserDataExtras = {};
  if (patch.lastName !== undefined) extrasPatch.lastName = patch.lastName;
  if (patch.dob !== undefined) extrasPatch.dob = patch.dob;
  if (patch.shoeSize !== undefined) extrasPatch.shoeSize = patch.shoeSize;
  if (patch.clothingSize !== undefined) extrasPatch.clothingSize = patch.clothingSize;
  let extrasOk = true;
  if (Object.keys(extrasPatch).length > 0 && userIdentifier) {
    extrasOk = await upsertUserDataRecord(userIdentifier, extrasPatch);
  }

  return signinOk && extrasOk ? { ok: true } : { ok: false, error: await se('updateFailed') };
}

export async function updateAddressesAction(
  addresses: OeAddress[],
): Promise<{ ok: boolean; error?: string; addresses?: OeAddress[] }> {
  if (!hasStoredSession()) return { ok: false, error: await se('notAuthenticated') };
  const userIdentifier = readUserIdentifier();
  if (!userIdentifier) return { ok: false, error: await se('missingUserId') };

  const existing = await fetchUserAddresses();
  const existingById = new Map(
    existing
      .filter((a): a is OeAddress & { recordId: number } => typeof a.recordId === 'number')
      .map((a) => [a.recordId, a]),
  );
  const incomingRecordIds = new Set(addresses.map((a) => a.recordId).filter((v): v is number => typeof v === 'number'));

  // Delete records that are no longer in the incoming list
  await Promise.all(
    existing
      .filter(
        (a): a is OeAddress & { recordId: number } => a.recordId !== undefined && !incomingRecordIds.has(a.recordId),
      )
      .map((a) => deleteUserAddress(a.recordId)),
  );

  // POST new (no recordId) and PUT existing
  const finalised: OeAddress[] = [];
  const errors: string[] = [];
  for (const addr of addresses) {
    if (addr.recordId && existingById.has(addr.recordId)) {
      const ok = await putUserAddress(addr.recordId, addr);
      if (!ok)
        errors.push(
          `Could not update address "${addr.name}" (PUT not allowed for users — admin must grant rights or use POST-only flow)`,
        );
      finalised.push({ ...addr, id: String(addr.recordId) });
    } else {
      const created = await postUserAddress(userIdentifier, addr);
      if (created.ok && created.record.id) {
        finalised.push({ ...addr, id: String(created.record.id), recordId: created.record.id });
      } else {
        errors.push(
          created.ok ? `POST returned no record id for "${addr.name}"` : `Address "${addr.name}": ${created.message}`,
        );
        finalised.push(addr);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; '), addresses: finalised };
  }
  return { ok: true, addresses: finalised };
}

export async function updateSubscriptionsAction(subs: OeSubscriptions): Promise<{ ok: boolean; error?: string }> {
  if (!hasStoredSession()) return { ok: false, error: await se('notAuthenticated') };
  const userIdentifier = readUserIdentifier();

  // 1) email/sms remain mirrored in sign-in formData (they're declared there)
  const signinOk = await putUser({
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    formData: [
      {
        marker: 'users_subscribe_to_promotional_email',
        type: 'radioButton',
        value: subs.emailNewsletter ? 'true' : 'false',
      },
      {
        marker: 'users_subscribe_to_promotional_sms',
        type: 'radioButton',
        value: subs.smsNotifications ? 'true' : 'false',
      },
    ],
  });

  // 2) All 7 toggles live in the subscription_management form-data record
  const formOk = userIdentifier ? await upsertSubsRecord(userIdentifier, subs) : false;

  return signinOk && formOk ? { ok: true } : { ok: false, error: await se('updateFailed') };
}

export async function updateConsentAction(consent: OeConsent): Promise<{ ok: boolean; error?: string }> {
  if (!hasStoredSession()) return { ok: false, error: await se('notAuthenticated') };
  const userIdentifier = readUserIdentifier();
  if (!userIdentifier) return { ok: false, error: await se('missingUserId') };

  // Both consents live in the user_data form.
  const ok = await upsertUserDataRecord(userIdentifier, {
    consentDataProcessing: consent.dataProcessing,
    consentCrossBorder: consent.crossBorder,
  });

  return ok ? { ok: true } : { ok: false, error: await se('updateFailed') };
}

// ── Cart / Wishlist ──────────────────────────────────────────────────────────

export async function syncCartAction(items: OeCartItem[]): Promise<{ ok: boolean; items: OeCartItem[] }> {
  if (!hasStoredSession()) return { ok: false, items: [] };
  const api = getApiSafe();
  if (!api) return { ok: false, items: [] };
  const result = await api.Users.setCart({ items });
  if (isError(result)) return { ok: false, items: [] };
  return { ok: true, items: result.items ?? [] };
}

export async function getCartAction(): Promise<OeCartItem[]> {
  if (!hasStoredSession()) return [];
  const api = getApiSafe();
  if (!api) return [];
  const result = await api.Users.getCart();
  if (isError(result)) return [];
  return result.items ?? [];
}

export async function syncWishlistAction(items: OeWishlistItem[]): Promise<{ ok: boolean; items: OeWishlistItem[] }> {
  if (!hasStoredSession()) return { ok: false, items: [] };
  const api = getApiSafe();
  if (!api) return { ok: false, items: [] };
  const result = await api.Users.setWishlist({ items });
  if (isError(result)) return { ok: false, items: [] };
  return { ok: true, items: result.items ?? [] };
}

export async function getWishlistAction(): Promise<OeWishlistItem[]> {
  if (!hasStoredSession()) return [];
  const api = getApiSafe();
  if (!api) return [];
  const result = await api.Users.getWishlist();
  if (isError(result)) return [];
  return result.items ?? [];
}

// ── Recently viewed (stored on the user `state` blob) ────────────────────────

const RECENTLY_VIEWED_MAX = 100;

/** Append a product to the user's recently-viewed trail and persist it on the OE user `state` blob. */
export async function pushRecentlyViewedAction(
  productId: number,
): Promise<{ ok: boolean; items: OeRecentlyViewedItem[] }> {
  if (!Number.isFinite(productId) || productId <= 0) return { ok: false, items: [] };
  if (!hasStoredSession()) return { ok: false, items: [] };
  const currentState = await readStateFromMe();
  const prev = Array.isArray(currentState.recentlyViewed) ? currentState.recentlyViewed : [];
  // Strip any existing entry for the same product so we can prepend a fresh one.
  const without = prev.filter((it) => Number(it.productId) !== productId);
  const next: OeRecentlyViewedItem[] = [{ productId, viewedAt: new Date().toISOString() }, ...without].slice(
    0,
    RECENTLY_VIEWED_MAX,
  );
  const nextState: OeUserState = { ...currentState, recentlyViewed: next };
  const ok = await putUser({
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    state: nextState,
  });
  return { ok, items: ok ? next : prev };
}

/** Read the user's recently-viewed trail straight from OE user state. */
export async function getRecentlyViewedAction(): Promise<OeRecentlyViewedItem[]> {
  if (!hasStoredSession()) return [];
  const state = await readStateFromMe();
  return Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [];
}

/** Bulk-merge a client-built trail into the OE state. */
export async function mergeRecentlyViewedAction(
  incoming: OeRecentlyViewedItem[],
): Promise<{ ok: boolean; items: OeRecentlyViewedItem[] }> {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return { ok: true, items: await getRecentlyViewedAction() };
  }
  if (!hasStoredSession()) return { ok: false, items: [] };
  const currentState = await readStateFromMe();
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
  const ok = await putUser({
    formIdentifier: SIGNUP_FORM_IDENTIFIER,
    state: nextState,
  });
  return { ok, items: ok ? merged : server };
}

// ── Orders ───────────────────────────────────────────────────────────────────

export type CheckoutMethod = 'home' | 'store_pickup' | 'locker';

/** Preview-only order calculation. */
export interface PreviewOrderInput {
  products: Array<{ productId: number; quantity: number }>;
  couponCode?: string;
  /** How many bonus points the shopper wants to burn on this order. */
  bonusAmount?: number;
  currency?: string;
  /** Anonymous session identifier for guest checkout. */
  guestId?: string;
}
/** Bonus-programme constraints echoed by OE's `previewOrder`. Sourced from `preview.discountConfig.bonus` (per-order values) and `.settings`. */
export interface PreviewBonusConfig {
  /** User's total bonus balance (across all bonus types). */
  availableBalance: number;
  /** Maximum bonus deduction allowed on this specific order, computed by OE from `maxBonusPaymentPercent × totalSum` and per-account rules. */
  maxAmount: number;
  /** Minimum bonuses the shopper must redeem in one go (from admin panel). */
  minAmount: number | null;
  /** Minimum cart total required to unlock the bonus feature. */
  minOrderAmount: number | null;
}

/** Gift item OE appends to the order when a `gift`-type coupon (or gift-bearing discount) applies. */
export interface PreviewGiftItem {
  productId: number;
  quantity: number;
  /** Original catalogue price. */
  price: number;
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
  /** `true` when a `couponCode` was passed AND OE actually applied it to the order. */
  couponApplied: boolean;
  /** `true` when OE recognised the code (`coupon.valid`) but refused to apply it (`applied === false`). */
  couponValidButNotApplied: boolean;
  /** Human-readable reason the coupon was rejected. */
  couponReason: string | null;
  /** How much the coupon alone knocked off (before tier fallback). */
  couponDiscountAmount: number;
  /** Free products OE appends to the order because a gift-bearing coupon (or personal discount) applied. */
  giftItems: PreviewGiftItem[];
}
export type PreviewOrderResponse =
  | PreviewOrderResult
  | {
      ok: false;
      error: string;
      /** OE-numeric productIds this preview failed on because the products no longer exist server-side. */
      missingProductIds: number[];
    };

export async function previewOrderAction(input: PreviewOrderInput): Promise<PreviewOrderResponse> {
  if (!isOneEntryEnabled) return { ok: false, error: await se('oneEntryEnvNotConfigured'), missingProductIds: [] };

  const signedIn = hasStoredSession();
  // One browser = one visitor, so the singleton can carry the guest id directly.
  const api = getApiSafe();
  if (api && !signedIn && input.guestId) {
    api.Orders.setGuestId(input.guestId);
  }
  if (!api) {
    return {
      ok: true,
      totalSum: 0,
      totalSumWithDiscount: 0,
      bonusApplied: 0,
      totalDue: 0,
      discountAmount: 0,
      currency: input.currency ?? 'USD',
      bonus: { availableBalance: 0, maxAmount: 0, minAmount: null, minOrderAmount: null },
      couponApplied: false,
      couponValidButNotApplied: false,
      couponReason: null,
      couponDiscountAmount: 0,
      giftItems: [],
    };
  }

  try {
    // OE's `previewOrder` does not auto-apply `PERSONAL_DISCOUNT` for the authenticated user.
    const body = {
      products: input.products,
      // Use the shared TIER_MARKERS constant so a rename in `fetchLoyalty` propagates here without a stale copy silently dropping tiers.
      ...(signedIn ? { additionalDiscountsMarkers: [...TIER_MARKERS] } : {}),
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      ...(typeof input.bonusAmount === 'number' && input.bonusAmount > 0 ? { bonusAmount: input.bonusAmount } : {}),
    } satisfies ICreateOrderPreview;
    const result = await api.Orders.previewOrder(body, getLang());
    if (isError(result)) {
      const message = result.message ?? 'previewOrder failed';
      // OE surfaces missing products as `"Product 9171 not found"`.
      const missingProductIds = Array.from(message.matchAll(/product\s+(\d+)\s+not\s+found/gi), (m) =>
        Number(m[1]),
      ).filter((n) => Number.isFinite(n));
      return { ok: false, error: message, missingProductIds };
    }
    const totalSum = Number(result.totalSum ?? 0);
    let totalSumWithDiscount = Number(result.totalSumWithDiscount ?? totalSum);
    const bonusApplied = Number(result.bonusApplied ?? 0);
    let totalDue = Number(result.totalDue ?? Math.max(0, totalSumWithDiscount - bonusApplied));
    let discountAmount = Math.max(0, totalSum - totalSumWithDiscount);
    // `IOrderDiscountConfig.coupon` is declared `unknown`; OE fills it with `{ code, valid, applied, … }`, where `valid` means the code exists in the admin panel.
    const rawCoupon = (result.discountConfig?.coupon ?? null) as {
      code?: string;
      valid?: boolean;
      applied?: boolean;
      discountId?: number;
      discountIdentifier?: string;
    } | null;
    const couponApplied = input.couponCode != null && rawCoupon?.applied === true;
    // OE tells us `valid` separately — `valid && !applied` = conditions aren't met.
    const couponValidButNotApplied =
      input.couponCode != null && rawCoupon?.valid === true && rawCoupon?.applied !== true;

    // Extract free-gift lines from `orderPreview[]` (each item with `isGift: true`).
    const rawOrderPreview = Array.isArray(result.orderPreview) ? result.orderPreview : [];
    const giftItems: PreviewGiftItem[] = rawOrderPreview
      .filter((it) => it?.isGift === true)
      .map((it) => ({
        productId: Number(it.id),
        quantity: Number(it.quantity ?? 1),
        price: Number(it.price ?? 0),
      }))
      .filter((g) => Number.isFinite(g.productId) && g.productId > 0);

    // Fetch the discount config when a code was passed at all.
    let couponReason: string | null = null;
    let couponIsGiftOnly = false;
    if ((couponValidButNotApplied || couponApplied) && rawCoupon?.discountIdentifier) {
      try {
        // Use the app-token singleton for the config lookup.
        const cfg = await api.Discounts.getDiscountByMarker(rawCoupon.discountIdentifier, getLang());
        if (!isError(cfg)) {
          // `IDiscountCondition` declares `type` and `value: string`; OE also sends `conditionType`, and the value is often an object. `gifts` is a `Record` in the SDK but arrives as a list.
          const cfgObj = cfg as Omit<Partial<IDiscountsEntity>, 'conditions' | 'gifts'> & {
            conditions?: Array<{ type?: string; conditionType?: string; value?: unknown }>;
            gifts?: Array<unknown> | null;
          };
          // Gift-only coupon = discount awards a gift, not a price reduction.
          const dv = cfgObj.discountValue;
          const hasMonetaryValue = dv != null && typeof dv.value === 'number' && dv.value > 0;
          const hasGifts = Array.isArray(cfgObj.gifts) && cfgObj.gifts.length > 0;
          couponIsGiftOnly = couponApplied && !hasMonetaryValue && hasGifts;

          if (couponValidButNotApplied) {
            const codeLabel = input.couponCode ?? rawCoupon.discountIdentifier;
            const conditions = Array.isArray(cfgObj.conditions) ? cfgObj.conditions : [];
            // Order matters: check gates the shopper can actually resolve first.
            for (const c of conditions) {
              const type = String(c.conditionType ?? c.type ?? '').toUpperCase();
              const val = c.value;
              if (type === 'MIN_CART_AMOUNT') {
                const min =
                  typeof val === 'object' && val !== null
                    ? Number((val as { amount?: number }).amount ?? 0)
                    : Number(val ?? 0);
                if (min > 0 && totalSum < min) {
                  const remaining = min - totalSum;
                  couponReason = `Add $${remaining.toFixed(2)} more to unlock ${codeLabel} (minimum $${min.toFixed(2)})`;
                  break;
                }
              } else if (type === 'USER_LTV') {
                const threshold =
                  typeof val === 'object' && val !== null
                    ? Number((val as { amount?: number }).amount ?? 0)
                    : Number(val ?? 0);
                if (threshold > 0) {
                  couponReason = `${codeLabel} unlocks after $${threshold.toFixed(2)} in lifetime purchases`;
                  break;
                }
              } else if (
                type === 'PRODUCT' ||
                type === 'PRODUCT_IN_CART' ||
                type === 'CATEGORY' ||
                type === 'CATEGORY_IN_CART' ||
                type === 'ATTRIBUTE'
              ) {
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
        }
      } catch {
        /* config lookup failed — fall back to generic message on client
         * and treat coupon as non-gift-only (safer default). */
      }
    }
    // Gift-only coupons carry no monetary discount — any `discountAmount > 0` on the response comes from loyalty tier / other discounts.
    const couponDiscountAmount = couponApplied && !couponIsGiftOnly ? discountAmount : 0;

    // Fallback: when OE returns no discount despite the shopper qualifying for a personal tier (Bronze/Silver/…) we compute it ourselves from the tier config.
    if (discountAmount === 0 && totalSum > 0 && signedIn) {
      const [me, loyalty] = await Promise.all([fetchMe(), fetchLoyalty()]);
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
      // Consider every tier that has AT LEAST ONE gate (either LTV or cart amount).
      const tiersAll = (loyalty?.tiers ?? []).filter(
        (t) => typeof t.ltvThreshold === 'number' || typeof t.minCartAmount === 'number',
      );
      const isEligible = (t: (typeof tiersAll)[number]): boolean => {
        if (typeof t.ltvThreshold === 'number' && ltv < t.ltvThreshold) return false;
        if (typeof t.minCartAmount === 'number' && totalSum < t.minCartAmount) return false;
        return true;
      };
      let activeTier: (typeof tiersAll)[number] | null = null;
      for (let i = tiersAll.length - 1; i >= 0; i--) {
        if (isEligible(tiersAll[i])) {
          activeTier = tiersAll[i];
          break;
        }
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

    // Pull bonus constraints from OE's response so the UI can clamp the "use N bonuses" input and hide the field when the cart doesn't qualify.
    const dc: Partial<IOrderDiscountConfig> = result.discountConfig ?? {};
    const bonusCfg: Partial<IOrderDiscountBonus> = dc.bonus ?? {};
    const bonusSettings: Partial<IOrderDiscountSettings> = dc.settings ?? {};
    const bonus: PreviewBonusConfig = {
      availableBalance: Number(bonusCfg.availableBalance ?? 0),
      maxAmount: Number(bonusCfg.maxBonusDiscount ?? 0),
      minAmount:
        typeof bonusCfg.minBonusAmount === 'number'
          ? bonusCfg.minBonusAmount
          : typeof bonusSettings.minBonusAmount === 'number'
            ? bonusSettings.minBonusAmount
            : null,
      minOrderAmount:
        typeof bonusCfg.minOrderAmountForBonus === 'number'
          ? bonusCfg.minOrderAmountForBonus
          : typeof bonusSettings.minOrderAmountForBonus === 'number'
            ? bonusSettings.minOrderAmountForBonus
            : null,
    };

    return {
      ok: true,
      totalSum,
      totalSumWithDiscount,
      bonusApplied,
      totalDue,
      discountAmount,
      currency: String(result.currency ?? input.currency ?? 'USD'),
      bonus,
      couponApplied,
      couponValidButNotApplied,
      couponReason,
      couponDiscountAmount,
      giftItems,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network'), missingProductIds: [] };
  }
}

export interface CreateOrderInput {
  /** Logical delivery method — actual storage marker is derived. */
  storage: CheckoutMethod;
  paymentAccount: string;
  /** Payment account type from OE — `custom` pays offline, every other provider goes through a hosted checkout. */
  paymentAccountType?: PaymentAccountType;
  products: IOrderProductData[];
  formData?: IOrdersFormData[];
  currency?: string;
  /** Coupon code to apply. */
  couponCode?: string;
  /** Bonus points to burn — OE clamps to `min(balance, cap)`. */
  bonusAmount?: number;
  /** Required for guest checkout. */
  guestId?: string;
  /** Browser origin (e.g. `http://localhost:3002`). */
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
  { ok: true; orderId: number; paymentUrl: string | null; paymentSessionError?: string } | { ok: false; error: string }
> {
  if (!isOneEntryEnabled) return { ok: false, error: await se('oneEntryEnvNotConfigured') };

  const signedIn = hasStoredSession();
  const isGuest = !signedIn;
  const storageMarker = isGuest ? `${input.storage}_guest` : input.storage;
  const formIdentifier = isGuest ? `${FORM_IDENTIFIER_MAP[input.storage]}_guest` : FORM_IDENTIFIER_MAP[input.storage];

  // The singleton already carries the session for signed-in shoppers.
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('sdkNotInitialised') };
  if (isGuest && input.guestId) {
    api.Orders.setGuestId(input.guestId);
  }

  try {
    // `currency` is accepted by the endpoint but absent from `IOrderData`.
    const body: IOrderData & { currency?: string } = {
      formIdentifier,
      paymentAccountIdentifier: input.paymentAccount,
      formData: input.formData ?? [],
      products: input.products,
      currency: input.currency ?? 'USD',
    };
    if (input.couponCode) body.couponCode = input.couponCode;
    if (typeof input.bonusAmount === 'number' && input.bonusAmount > 0) body.bonusAmount = input.bonusAmount;
    // Mirror `previewOrderAction` — pass tier markers so OE has a chance to apply the shopper's `PERSONAL_DISCOUNT` at order-creation time.
    body.additionalDiscountsMarkers = [...TIER_MARKERS];
    // Pinned like the other writes: `langCode` decides which locale slot the order's form data lands in, and an order filed under `de_DE` would be invisible to every read in this file (all of which pin the canonical slot).
    const result = await api.Orders.createOrder(storageMarker, body, DEFAULT_LOCALE);
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'createOrder failed' };
    }
    // `IBaseOrdersEntity` has no `paymentUrl` — the real API adds it on legacy provider configs.
    const raw = result as IBaseOrdersEntity & { paymentUrl?: string | null };
    const orderId = typeof raw.id === 'number' ? raw.id : Number(raw.id ?? 0);
    let paymentUrl = typeof raw.paymentUrl === 'string' ? raw.paymentUrl : null;
    let paymentSessionError: string | undefined;

    // Order placed — drop the cached products whose stock just moved. Scoped to this order's items on purpose: see `revalidate-action.ts`.
    try {
      await revalidateAfterOrderAction(input.products.map((p) => p.productId));
    } catch {
      /* cache invalidation is best-effort — the order still landed */
    }

    if (!paymentUrl && orderId && input.paymentAccountType && isOnlinePaymentAccount(input.paymentAccountType)) {
      // Hosted-checkout accounts (stripe, yookassa, midtrans, xendit …): mint a payment session via SDK.
      try {
        const sessionResult = await api.Payments.createSession(orderId, 'session', false);
        if (isError(sessionResult)) {
          paymentSessionError = sessionResult.message ?? 'createSession failed';
          console.error('[createOrderAction] payment session creation failed:', paymentSessionError);
        } else {
          if (typeof sessionResult.paymentUrl === 'string') paymentUrl = sessionResult.paymentUrl;
        }
      } catch (err) {
        paymentSessionError = err instanceof Error ? err.message : await se('network');
        console.error('[createOrderAction] payment session network error:', paymentSessionError);
      }
    }
    return { ok: true, orderId, paymentUrl, paymentSessionError };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network') };
  }
}
