'use server';
import { cookies } from 'next/headers';
import { oneentry, isOneEntryEnabled, isError, type OeError } from '../index';
import { loadProductsByIds } from '../catalog/products';
import { DEFAULT_LOCALE } from '../locale';

const AUTH_MARKER = 'email';
const SIGNUP_FORM_IDENTIFIER = 'signin';
const ACCESS_COOKIE = 'oe_access';
const REFRESH_COOKIE = 'oe_refresh';
const IDENTIFIER_COOKIE = 'oe_user';

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
  totalSum: string;
  currency: string;
  createdDate?: string;
  products: OeOrderProduct[];
  formData: Record<string, unknown>;
}

export interface OeUserState {
  /** Profile fields not covered by the sign-in form */
  profile?: {
    lastName?: string;
    dob?: string;
    shoeSize?: string;
    clothingSize?: string;
  };
  /** Deprecated — addresses now live in the user_addresses form. Kept so old
   *  accounts that wrote to state.addresses still render until they re-save. */
  addresses?: OeAddress[];
  /** The five subscription flags that aren't in the sign-in form */
  subscriptionsExtra?: {
    pushNotifications?: boolean;
    orderUpdates?: boolean;
    newArrivals?: boolean;
    saleAlerts?: boolean;
    loyaltyUpdates?: boolean;
  };
  consent?: OeConsent;
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
  /** subscriptions assembled from signin formData (email/sms) + state.subscriptionsExtra */
  subscriptions: OeSubscriptions;
  /** addresses from state */
  addresses: OeAddress[];
  /** consent from state */
  consent: OeConsent;
  /** extra profile fields from state */
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
}

interface OeAuthEntity {
  userIdentifier: string;
  authProviderIdentifier: string;
  accessToken: string;
  refreshToken: string;
}

interface CookieJar {
  set(name: string, value: string, opts: Record<string, unknown>): void;
  delete(name: string): void;
  get(name: string): { value: string } | undefined;
}

async function setSessionCookies(jar: CookieJar, entity: OeAuthEntity): Promise<void> {
  const baseOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  jar.set(ACCESS_COOKIE, entity.accessToken, { ...baseOpts, maxAge: 60 * 60 * 24 });
  jar.set(REFRESH_COOKIE, entity.refreshToken, { ...baseOpts, maxAge: 60 * 60 * 24 * 7 });
  jar.set(IDENTIFIER_COOKIE, entity.userIdentifier, {
    ...baseOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function clearSessionCookies(jar: CookieJar): Promise<void> {
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(IDENTIFIER_COOKIE);
}

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
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return [];
  const headers = { 'x-app-token': appToken, Authorization: `Bearer ${accessToken}`, accept: 'application/json' };
  type RawProduct = {
    id?: number;
    title?: string;
    quantity?: number;
    price?: number;
    sku?: string | null;
    previewImage?: { downloadLink?: string } | null;
  };
  type RawOrder = {
    id?: number;
    statusIdentifier?: string;
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
        const res = await fetch(
          `${url}/api/content/orders-storage/marker/${marker}/orders?langCode=en_US&limit=100&offset=0`,
          { headers, cache: 'no-store' },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items?: RawOrder[]; total?: number };
        for (const o of data.items ?? []) {
          const formDataMap: Record<string, unknown> = {};
          for (const f of o.formData ?? []) {
            if (f.marker) formDataMap[f.marker] = f.value;
          }
          all.push({
            id: o.id ?? 0,
            storage: marker,
            statusIdentifier: o.statusIdentifier ?? '',
            totalSum: o.totalSum ?? '0',
            currency: o.currency ?? 'USD',
            createdDate: o.createdDate,
            products: (o.products ?? []).map((p) => ({
              id: p.id ?? 0,
              title: p.title ?? '',
              quantity: p.quantity ?? 1,
              price: p.price ?? 0,
              sku: p.sku ?? null,
              image: p.previewImage?.downloadLink ?? '',
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

async function meRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T | null> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return null;
  try {
    const res = await fetch(`${url}/api/content/users${path}`, {
      ...init,
      headers: {
        'x-app-token': appToken,
        Authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

  const [data, cart, wishlist, addrRecords, userDataRec, subsRec, orders] = await Promise.all([
    meRequest<RawMe>(accessToken, '/me?langCode=en_US'),
    meRequest<RawCart>(accessToken, '/me/cart'),
    meRequest<RawWishlist>(accessToken, '/me/wishlist'),
    fetchUserAddresses(accessToken),
    fetchUserDataRecord(accessToken),
    fetchSubsRecord(accessToken),
    fetchUserOrders(accessToken),
  ]);
  if (!data) return null;

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
  const subsExtra = state.subscriptionsExtra ?? {};
  // Subscriptions: prefer form-data record, fallback to signin formData (email/sms)
  // and legacy state.subscriptionsExtra for the other five.
  const fromForm = subsRec.extras;
  const subscriptions: OeSubscriptions = {
    emailNewsletter: fromForm.emailNewsletter ?? radioBool(formDataMap['users_subscribe_to_promotional_email']),
    smsNotifications: fromForm.smsNotifications ?? radioBool(formDataMap['users_subscribe_to_promotional_sms']),
    pushNotifications: fromForm.pushNotifications ?? subsExtra.pushNotifications ?? false,
    orderUpdates: fromForm.orderUpdates ?? subsExtra.orderUpdates ?? false,
    newArrivals: fromForm.newArrivals ?? subsExtra.newArrivals ?? false,
    saleAlerts: fromForm.saleAlerts ?? subsExtra.saleAlerts ?? false,
    loyaltyUpdates: fromForm.loyaltyUpdates ?? subsExtra.loyaltyUpdates ?? false,
  };

  // Profile extras: prefer user_data form record, fallback to legacy state.profile.
  const userExtras = userDataRec.extras;
  const userDataSource = userDataRec.recordId ? 'form-data' : (state.profile || state.consent ? 'state (legacy)' : 'empty');
  console.log(`[OE] user_data for ${data.identifier}: from ${userDataSource}` + (userDataRec.recordId ? ` (record id=${userDataRec.recordId})` : ''));
  const consent: OeConsent = {
    dataProcessing: userExtras.consentDataProcessing ?? state.consent?.dataProcessing ?? false,
    crossBorder: userExtras.consentCrossBorder ?? state.consent?.crossBorder ?? false,
  };

  return {
    id: data.id ?? 0,
    identifier: data.identifier ?? '',
    firstName: asString(formDataMap['first_name']),
    email: asString(formDataMap['email']) ?? data.identifier,
    phone: asString(formDataMap['phone']),
    gender: asGender(formDataMap['gender']),
    formData: formDataMap,
    lastName: userExtras.lastName || state.profile?.lastName,
    dob: userExtras.dob || state.profile?.dob,
    shoeSize: userExtras.shoeSize || state.profile?.shoeSize,
    clothingSize: userExtras.clothingSize || state.profile?.clothingSize,
    addresses: (() => {
      const source = addrRecords.length > 0 ? 'form-data' : (state.addresses?.length ? 'state.addresses (legacy)' : 'empty');
      console.log(`[OE] addresses for ${data.identifier}: ${addrRecords.length || state.addresses?.length || 0} from ${source}`);
      return addrRecords.length > 0 ? addrRecords : (state.addresses ?? []);
    })(),
    subscriptions,
    consent,
    cart: cart?.items ?? [],
    wishlist: wishlist?.items ?? [],
    recentlyViewed: Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [],
    orders,
  };
}

async function readAccessFromCookies(): Promise<string | null> {
  const jar = (await cookies()) as unknown as CookieJar;
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

async function readStateFromMe(accessToken: string): Promise<OeUserState> {
  const data = await meRequest<{ state?: OeUserState }>(accessToken, '/me?langCode=en_US');
  return data?.state ?? {};
}

// ── Form-data helpers (raw fetch under user accessToken) ────────────────────

const FORM_DATA_BASE = '/api/content/form-data';

async function formDataRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const result = await formDataRequestVerbose<T>(accessToken, path, init);
  return result.ok ? result.data : null;
}

interface FdSuccess<T> { ok: true; data: T }
interface FdError { ok: false; status: number; message: string }
async function formDataRequestVerbose<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<FdSuccess<T> | FdError> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return { ok: false, status: 0, message: 'OneEntry env not configured' };
  try {
    const res = await fetch(`${url}${FORM_DATA_BASE}${path}`, {
      ...init,
      headers: {
        'x-app-token': appToken,
        Authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    const text = await res.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : `HTTP ${res.status}`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: body as T };
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : 'Network error' };
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
  const result = await formDataRequest<{ items?: RawFormRecord[]; total?: number }>(
    accessToken,
    `/marker/user_addresses?formModuleConfigId=${USER_ADDRESSES_MODULE_CONFIG_ID}&isExtended=0&langCode=en_US&offset=0&limit=100`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return (result?.items ?? []).map(recordToAddress);
}

async function postUserAddress(
  accessToken: string,
  userIdentifier: string,
  address: OeAddress,
): Promise<{ ok: true; record: RawFormRecord } | { ok: false; message: string }> {
  type PostResponse = RawFormRecord & { formData?: RawFormRecord; actionMessage?: string };
  const res = await formDataRequestVerbose<PostResponse>(accessToken, '', {
    method: 'POST',
    body: JSON.stringify({
      formIdentifier: 'user_addresses',
      formModuleConfigId: USER_ADDRESSES_MODULE_CONFIG_ID,
      moduleEntityIdentifier: userIdentifier,
      replayTo: null,
      status: 'sent',
      langCode: DEFAULT_LOCALE,
      formData: { en_US: addressToFormData(address) },
    }),
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
  const result = await formDataRequest<unknown>(accessToken, `/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify({
      langCode: DEFAULT_LOCALE,
      formData: addressToFormData(address),
    }),
  });
  return result !== null;
}

async function deleteUserAddress(accessToken: string, recordId: number): Promise<boolean> {
  const result = await formDataRequest<unknown>(accessToken, `/${recordId}`, { method: 'DELETE' });
  return result !== null;
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
  const result = await formDataRequest<{ items?: RawFormRecord[] }>(
    accessToken,
    `/marker/user_data?formModuleConfigId=${USER_DATA_MODULE_CONFIG_ID}&isExtended=0&langCode=en_US&offset=0&limit=10`,
    { method: 'POST', body: JSON.stringify({}) },
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
    const result = await formDataRequest<unknown>(accessToken, `/${current.recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ langCode: DEFAULT_LOCALE, formData }),
    });
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
  const created = await formDataRequest<PostResponse>(accessToken, '', {
    method: 'POST',
    body: JSON.stringify({
      formIdentifier: 'user_data',
      formModuleConfigId: USER_DATA_MODULE_CONFIG_ID,
      moduleEntityIdentifier: userIdentifier,
      replayTo: null,
      status: 'sent',
      langCode: DEFAULT_LOCALE,
      formData: { en_US: postData },
    }),
  });
  if (!created) return false;
  const newId = (created.formData && typeof created.formData === 'object' && !Array.isArray(created.formData)
    ? (created.formData as RawFormRecord).id
    : created.id);
  if (!newId) return true;
  if (merged.dob) {
    const result = await formDataRequest<unknown>(accessToken, `/${newId}`, {
      method: 'PUT',
      body: JSON.stringify({ langCode: DEFAULT_LOCALE, formData }),
    });
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
  const result = await formDataRequest<{ items?: RawFormRecord[] }>(
    accessToken,
    `/marker/subscription_management?formModuleConfigId=${SUBSCRIPTION_MGMT_MODULE_CONFIG_ID}&isExtended=0&langCode=en_US&offset=0&limit=10`,
    { method: 'POST', body: JSON.stringify({}) },
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
    const result = await formDataRequest<unknown>(accessToken, `/${current.recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ langCode: DEFAULT_LOCALE, formData }),
    });
    return result !== null;
  }
  const result = await formDataRequest<RawFormRecord>(accessToken, '', {
    method: 'POST',
    body: JSON.stringify({
      formIdentifier: 'subscription_management',
      formModuleConfigId: SUBSCRIPTION_MGMT_MODULE_CONFIG_ID,
      moduleEntityIdentifier: userIdentifier,
      replayTo: null,
      status: 'sent',
      langCode: DEFAULT_LOCALE,
      formData: { en_US: formData },
    }),
  });
  return result !== null;
}

async function putUser(accessToken: string, body: Record<string, unknown>): Promise<boolean> {
  // PUT /me wants langCode at the top level and formData wrapped by locale
  // (e.g. `formData: { en_US: [...] }`) — opposite of POST sign-up which
  // takes a flat array.
  const normalized: Record<string, unknown> = { langCode: DEFAULT_LOCALE, ...body };
  if (Array.isArray(normalized.formData)) {
    normalized.formData = { en_US: normalized.formData };
  }
  const result = await meRequest<true | OeError>(accessToken, '/me', {
    method: 'PUT',
    body: JSON.stringify(normalized),
  });
  return result === true;
}
void DEFAULT_SUBSCRIPTIONS;

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

/**
 * Trade a Google `id_token` (received via Google Identity Services popup on
 * the client) for an OE session. OE verifies the JWT against its configured
 * Google OAuth audience, then returns the same `OeAuthEntity` shape as the
 * email auth — so the calling client can treat the success exactly like a
 * regular email login.
 */
/** OE on this tenant doesn't document the exact body shape for the OAuth
 *  endpoint, and the response error is identical for any wrong field. So we
 *  try the field names known to be used by other OE installs in order
 *  until one of them returns a non-error result. */
const OAUTH_BODY_VARIANTS = (token: string): Array<Record<string, string>> => [
  { accessToken: token },
  { idToken: token },
  { token },
  { code: token },
  { credential: token },
];

async function tryOauthVariants(token: string): Promise<
  | { ok: true; entity: OeAuthEntity; matchedField: string }
  | { ok: false; attempts: Array<{ field: string; error: string }> }
> {
  const attempts: Array<{ field: string; error: string }> = [];
  if (!oneentry) return { ok: false, attempts: [{ field: '', error: 'SDK not initialised' }] };
  const sdk = oneentry;
  for (const body of OAUTH_BODY_VARIANTS(token)) {
    const field = Object.keys(body)[0];
    try {
      const result = await sdk.AuthProvider.oauth(
        GOOGLE_AUTH_MARKER,
        body as unknown as Parameters<typeof sdk.AuthProvider.oauth>[1],
      );
      if (!isError(result)) {
        return { ok: true, entity: result as OeAuthEntity, matchedField: field };
      }
      attempts.push({ field, error: result.message ?? 'unknown error' });
    } catch (err) {
      attempts.push({ field, error: err instanceof Error ? err.message : 'unknown error' });
    }
  }
  return { ok: false, attempts };
}

export async function signInWithGoogleAction(accessToken: string): Promise<AuthResult> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  if (!accessToken) {
    return { ok: false, error: 'Missing Google access token' };
  }
  try {
    const attempt = await tryOauthVariants(accessToken);
    if (!attempt.ok) {
      const detail = attempt.attempts
        .map(a => `${a.field}: ${a.error}`)
        .join(' | ');
      return { ok: false, error: `OE rejected every body variant — ${detail}` };
    }
    const jar = (await cookies()) as unknown as CookieJar;
    await setSessionCookies(jar, attempt.entity);
    const user = await fetchMe(attempt.entity.accessToken);
    return { ok: true, userIdentifier: attempt.entity.userIdentifier, user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed' };
  }
}

/**
 * Verify a Google `id_token` against OE's `google` provider on behalf of the
 * currently logged-in user. OE accepts the same `oauth` endpoint used for
 * sign-in; when the issuer matches and the audience equals the configured
 * Google client ID, OE returns a fresh session entity. We do not overwrite
 * the existing cookies — the calling page only needs the success flag to
 * mark the provider as "connected" in the UI.
 */
export async function connectGoogleAccountAction(
  accessToken: string,
): Promise<{ ok: true; matchedField?: string } | { ok: false; error: string }> {
  if (!isOneEntryEnabled || !oneentry) {
    return { ok: false, error: 'OneEntry is not configured' };
  }
  if (!accessToken) {
    return { ok: false, error: 'Missing Google access token' };
  }
  try {
    const attempt = await tryOauthVariants(accessToken);
    if (!attempt.ok) {
      const detail = attempt.attempts.map(a => `${a.field}: ${a.error}`).join(' | ');
      return { ok: false, error: `OE rejected every body variant — ${detail}` };
    }
    return { ok: true, matchedField: attempt.matchedField };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to verify Google account' };
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
  const access = await readAccessFromCookies();
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

  // 3) Drop legacy state.profile copy once migration is done
  const stateNow = await readStateFromMe(access);
  if (stateNow.profile) {
    const { profile: _drop, ...rest } = stateNow;
    void _drop;
    await putUser(access, { formIdentifier: SIGNUP_FORM_IDENTIFIER, state: rest });
  }

  return signinOk && extrasOk ? { ok: true } : { ok: false, error: 'Update failed' };
}

export async function updateAddressesAction(
  addresses: OeAddress[],
): Promise<{ ok: boolean; error?: string; addresses?: OeAddress[] }> {
  const access = await readAccessFromCookies();
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

  // Clean up the legacy state.addresses copy so it doesn't shadow form data
  // for accounts that were saved before the form-data migration.
  const stateNow = await readStateFromMe(access);
  if (stateNow.addresses && stateNow.addresses.length > 0) {
    const { addresses: _drop, ...rest } = stateNow;
    void _drop;
    await putUser(access, { formIdentifier: SIGNUP_FORM_IDENTIFIER, state: rest });
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; '), addresses: finalised };
  }
  return { ok: true, addresses: finalised };
}

export async function updateSubscriptionsAction(
  subs: OeSubscriptions,
): Promise<{ ok: boolean; error?: string }> {
  const access = await readAccessFromCookies();
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

  // 3) Drop legacy state.subscriptionsExtra after first save
  const stateNow = await readStateFromMe(access);
  if (stateNow.subscriptionsExtra) {
    const { subscriptionsExtra: _drop, ...rest } = stateNow;
    void _drop;
    await putUser(access, { formIdentifier: SIGNUP_FORM_IDENTIFIER, state: rest });
  }

  return signinOk && formOk ? { ok: true } : { ok: false, error: 'Update failed' };
}

export async function updateConsentAction(
  consent: OeConsent,
): Promise<{ ok: boolean; error?: string }> {
  const access = await readAccessFromCookies();
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

  // Drop legacy state.consent copy
  const stateNow = await readStateFromMe(access);
  if (stateNow.consent) {
    const { consent: _drop, ...rest } = stateNow;
    void _drop;
    await putUser(access, { formIdentifier: SIGNUP_FORM_IDENTIFIER, state: rest });
  }

  return ok ? { ok: true } : { ok: false, error: 'Update failed' };
}

// ── Cart / Wishlist ──────────────────────────────────────────────────────────

export async function syncCartAction(
  items: OeCartItem[],
): Promise<{ ok: boolean; items: OeCartItem[] }> {
  const access = await readAccessFromCookies();
  if (!access) return { ok: false, items: [] };
  const result = await meRequest<{ items?: OeCartItem[]; total?: number }>(
    access,
    '/me/cart',
    { method: 'PUT', body: JSON.stringify({ items }) },
  );
  return { ok: !!result, items: result?.items ?? [] };
}

export async function getCartAction(): Promise<OeCartItem[]> {
  const access = await readAccessFromCookies();
  if (!access) return [];
  const result = await meRequest<{ items?: OeCartItem[] }>(access, '/me/cart');
  return result?.items ?? [];
}

export async function syncWishlistAction(
  items: OeWishlistItem[],
): Promise<{ ok: boolean; items: OeWishlistItem[] }> {
  const access = await readAccessFromCookies();
  if (!access) return { ok: false, items: [] };
  const result = await meRequest<{ items?: OeWishlistItem[]; total?: number }>(
    access,
    '/me/wishlist',
    { method: 'PUT', body: JSON.stringify({ items }) },
  );
  return { ok: !!result, items: result?.items ?? [] };
}

export async function getWishlistAction(): Promise<OeWishlistItem[]> {
  const access = await readAccessFromCookies();
  if (!access) return [];
  const result = await meRequest<{ items?: OeWishlistItem[] }>(access, '/me/wishlist');
  return result?.items ?? [];
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
  const access = await readAccessFromCookies();
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
  const access = await readAccessFromCookies();
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
  const access = await readAccessFromCookies();
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
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return { ok: false, error: 'OneEntry env not configured' };

  const access = await readAccessFromCookies();
  const isGuest = !access;
  const storageMarker = isGuest ? `${input.storage}_guest` : input.storage;
  const formIdentifier = isGuest
    ? `${FORM_IDENTIFIER_MAP[input.storage]}_guest`
    : FORM_IDENTIFIER_MAP[input.storage];

  const headers: Record<string, string> = {
    'x-app-token': appToken,
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  else if (input.guestId) headers['x-guest-id'] = input.guestId;

  try {
    const body = {
      langCode: DEFAULT_LOCALE,
      formIdentifier,
      paymentAccountIdentifier: input.paymentAccount,
      // OE order endpoint wants formData wrapped by locale, like /me PUT and
      // /form-data POST. A flat array triggers `"formData" must be of type object`.
      formData: { en_US: input.formData ?? [] },
      products: input.products,
      currency: input.currency ?? 'USD',
    };
    const res = await fetch(`${url}/api/content/orders-storage/marker/${storageMarker}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const txt = await res.text();
    let data: unknown;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) {
      const msg = data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const obj = (data && typeof data === 'object') ? (data as { id?: unknown; paymentUrl?: unknown }) : {};
    const orderId = typeof obj.id === 'number' ? obj.id : Number(obj.id ?? 0);
    // OE returns paymentUrl only for legacy provider configurations. For
    // Stripe-backed accounts the URL lives behind a separate /payments/sessions
    // POST that must be called with the freshly minted orderId.
    let paymentUrl = typeof obj.paymentUrl === 'string' ? obj.paymentUrl : null;
    let paymentSessionError: string | undefined;
    if (!paymentUrl && orderId && input.paymentAccountType === 'stripe') {
      try {
        // Tell Stripe where to send the user back. Without these the OE
        // merchant's default URL (often a placeholder like google.com) wins,
        // leaving the buyer stranded after a successful payment.
        const successUrl = input.origin
          ? `${input.origin}/checkout/confirmation?order_id=${orderId}&status=success`
          : undefined;
        const cancelUrl = input.origin
          ? `${input.origin}/checkout/payment?order_id=${orderId}&status=cancelled`
          : undefined;
        const sessionRes = await fetch(`${url}/api/content/payments/sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId,
            type: 'session',
            automaticTaxEnabled: false,
            ...(successUrl ? { successUrl } : {}),
            ...(cancelUrl ? { cancelUrl } : {}),
          }),
          cache: 'no-store',
        });
        const sessionTxt = await sessionRes.text();
        let sessionData: { paymentUrl?: unknown; message?: unknown } | null = null;
        try { sessionData = sessionTxt ? JSON.parse(sessionTxt) : null; } catch { /* keep null */ }
        if (sessionRes.ok && sessionData && typeof sessionData.paymentUrl === 'string') {
          paymentUrl = sessionData.paymentUrl;
        } else {
          const reason = sessionData && typeof sessionData.message === 'string'
            ? sessionData.message
            : `HTTP ${sessionRes.status}${sessionTxt ? `: ${sessionTxt.slice(0, 200)}` : ''}`;
          paymentSessionError = reason;
          console.error('[createOrderAction] Stripe session creation failed:', reason);
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
