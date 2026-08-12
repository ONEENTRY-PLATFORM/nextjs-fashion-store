import { z } from 'zod';

import { VALIDATION_MESSAGES, type ValidationMessages } from '@/app/data/validationMessages';

/** Shape of the message table the schemas are built from. */
export type FormMessages = ValidationMessages;

/** Min/max string length for one field, as configured on the OE attribute. */
export interface FieldBounds {
  min?: number | null;
  max?: number | null;
  /**
   * `trimValidator` — OE strips surrounding whitespace before measuring, so a
   * padded value that looks long enough here would still be rejected there.
   */
  trim?: boolean;
}

/**
 * Length bounds for the checkout fields, read from the OE form the order will
 * actually be POSTed to (`checkout_home_delivery_guest`, `user_addresses`, …).
 *
 * OE enforces these server-side; without mirroring them the shopper only finds
 * out at "Place Order", as `required values are missing or incorrect:
 * checkout_home_guest_address_line1`. Every entry is optional — an unloaded
 * form adds no bounds and the shipped rules below still apply.
 */
export interface CheckoutBounds {
  address?: {
    fullName?: FieldBounds;
    phone?: FieldBounds;
    line1?: FieldBounds;
    city?: FieldBounds;
    postcode?: FieldBounds;
    instructions?: FieldBounds;
  };
  guestContact?: {
    fullName?: FieldBounds;
    phone?: FieldBounds;
  };
  /**
   * Exact length of the one-time recovery code, as configured on the OE auth
   * provider (`config.systemCodeLength`). `null`/absent when the admin panel
   * leaves it unset — the code field then only requires a non-empty value.
   */
  resetCodeLength?: number | null;
}

/**
 * Build the form schemas against one set of error messages.
 *
 * The schemas used to be module-level constants closing over the shipped
 * English copy, which made the wording unreachable from the admin panel. They
 * are a factory now so a Client Component can rebuild them from the CMS
 * dictionary — see `useSchemas()`.
 *
 * `M` is a plain object, so the returned schemas are cheap to recreate; do it
 * inside a `useMemo` keyed on the message table rather than per render.
 *
 * @param M - Error messages, CMS values or the shipped copy.
 * @param B - Length bounds mirrored from the OE checkout forms. Omitted in
 *            non-checkout contexts (and by the shipped exports below), where
 *            only the storefront's own rules apply.
 * @returns The seven form schemas, built with those messages.
 */
export function createSchemas(M: FormMessages, B: CheckoutBounds = {}) {
  // ─── Reusable field validators ──────────────────────────────────────────────

  /**
   * Layer the OE-configured length bounds on top of a field's own rules.
   *
   * `normalize` matches whatever transform the value undergoes before it is
   * POSTed — the phone loses its spaces on the way out, so its length must be
   * measured the same way OE will measure it.
   */
  const bounded = (schema: z.ZodString, bounds: FieldBounds | undefined, normalize: (v: string) => string = (v) => v) =>
    schema.superRefine((val, ctx) => {
      // Apply the field's own transform first, then OE's trim when the
      // attribute declares one — the length that matters is the one the server
      // will measure.
      const normalized = normalize(val);
      const len = (bounds?.trim ? normalized.trim() : normalized).length;
      // An empty optional field is the `required` validator's business, not
      // the length bound's — otherwise a blank "instructions" trips `min`.
      if (len === 0) return;
      if (bounds?.min != null && len < bounds.min) {
        ctx.addIssue({ code: 'custom', message: M.tooShort.replace('{min}', String(bounds.min)) });
      }
      if (bounds?.max != null && len > bounds.max) {
        ctx.addIssue({ code: 'custom', message: M.tooLong.replace('{max}', String(bounds.max)) });
      }
    });

  const compact = (v: string) => v.replace(/\s+/g, '');

  const emailSchema = z.string().min(1, M.emailRequired).email(M.emailInvalid);

  const passwordSchema = z.string().min(8, M.passwordTooShort).max(128, M.passwordTooLong);

  const phoneBase = z
    .string()
    .min(1, M.phoneRequired)
    .regex(/^\+?[\d\s\-()\[\]]{7,20}$/, M.phoneInvalid);

  const postcodeBase = z
    .string()
    .min(1, M.postcodeRequired)
    .regex(/^[A-Z0-9\s\-]{3,10}$/i, M.postcodeInvalid);

  // ─── Login ──────────────────────────────────────────────────────────────────

  /**
   * Login input is normally an email or a phone, but when the playground
   * is wired up to the real Platform Content API we also accept bare Platform
   * identifiers (e.g. "seed-demo-user-active-1") — those are how the
   * demo seed exposes accounts. The pattern below matches identifiers
   * consisting of letters/digits/hyphens/underscores/dots.
   */
  const loginSchema = z.object({
    input: z
      .string()
      .min(1, M.loginInputRequired)
      .refine(
        (val) => val.includes('@') || /^\+?[\d\s\-()\[\]]{7,20}$/.test(val) || /^[A-Za-z0-9._-]{3,80}$/.test(val),
        M.loginInputInvalid,
      ),
    password: z.string().min(1, M.passwordRequired),
  });

  // ─── Register ───────────────────────────────────────────────────────────────

  const registerSchema = z
    .object({
      firstName: z.string().min(1, M.firstNameRequired).max(60),
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1, M.passwordConfirm),
      acceptsTerms: z.literal(true, { error: () => ({ message: M.acceptTerms }) }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: M.passwordsMismatch,
      path: ['confirmPassword'],
    });

  // ─── Password recovery (one-time code from OE) ──────────────────────────────

  const resetRequestSchema = z.object({
    email: emailSchema,
  });

  /**
   * The code's length is provider config in OE (`systemCodeLength`), so it is
   * passed in rather than baked in — `B.resetCodeLength` is `null` when the
   * admin panel leaves it unset, and then any non-empty code is accepted and
   * OE has the final say.
   */
  const resetCodeSchema = z.object({
    code: z
      .string()
      .trim()
      .min(1, M.resetCodeRequired)
      .superRefine((val, ctx) => {
        const expected = B.resetCodeLength;
        if (expected != null && val.length !== expected) {
          ctx.addIssue({ code: 'custom', message: M.resetCodeTooShort.replace('%length%', String(expected)) });
        }
      }),
  });

  const resetPasswordSchema = z
    .object({
      password: passwordSchema,
      confirmPassword: z.string().min(1, M.passwordConfirm),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: M.passwordsMismatch,
      path: ['confirmPassword'],
    });

  // ─── Address (Delivery page) ────────────────────────────────────────────────

  const addressSchema = z.object({
    fullName: bounded(z.string().min(1, M.fullNameRequired).max(100), B.address?.fullName),
    phone: bounded(phoneBase, B.address?.phone, compact),
    line1: bounded(z.string().min(1, M.address1Required).max(200), B.address?.line1),
    city: bounded(z.string().min(1, M.cityRequired).max(100), B.address?.city),
    postcode: bounded(postcodeBase, B.address?.postcode),
    instructions: bounded(z.string().max(500), B.address?.instructions).optional(),
  });

  // ─── Guest contact (Store pickup / Parcel locker, when not logged in) ───────

  const guestContactSchema = z.object({
    fullName: bounded(z.string().min(1, M.fullNameRequired).max(100), B.guestContact?.fullName),
    email: emailSchema,
    phone: bounded(phoneBase, B.guestContact?.phone, compact),
  });

  // ─── Payment card ───────────────────────────────────────────────────────────

  const paymentSchema = z.object({
    cardNumber: z
      .string()
      .min(1, M.cardNumberRequired)
      .refine((val) => /^[\d\s]{13,19}$/.test(val), M.cardNumberInvalid)
      .refine((val) => luhn(val), M.cardNumberBad),
    expiry: z
      .string()
      .min(1, M.expiryRequired)
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, M.expiryFormat)
      .refine((val) => {
        const [mm, yy] = val.split('/').map(Number);
        const now = new Date();
        const exp = new Date(2000 + yy, mm - 1);
        return exp >= new Date(now.getFullYear(), now.getMonth());
      }, M.expiryExpired),
    cvv: z
      .string()
      .min(1, M.cvvRequired)
      .regex(/^\d{3,4}$/, M.cvvFormat),
    nameOnCard: z.string().min(1, M.nameOnCardRequired).max(100),
  });

  // ─── Profile (My Data) ─────────────────────────────────────────────────────

  const profileSchema = z.object({
    firstName: z.string().min(1, M.firstNameRequired).max(60),
    email: emailSchema,
    phone: z.string().refine((val) => val === '' || /^\+?[\d\s\-()\[\]]{7,20}$/.test(val), M.phoneInvalid),
    dob: z.string().max(20).optional(),
    shoeSize: z.string().max(10).optional(),
    clothingSize: z.string().max(10).optional(),
  });

  // ─── Promo code ─────────────────────────────────────────────────────────────

  const promoSchema = z.object({
    code: z.string().min(1, M.promoRequired).max(30).toUpperCase(),
  });

  return {
    loginSchema,
    registerSchema,
    resetRequestSchema,
    resetCodeSchema,
    resetPasswordSchema,
    addressSchema,
    guestContactSchema,
    paymentSchema,
    profileSchema,
    promoSchema,
  };
}

const luhn = (num: string): boolean => {
  const digits = num.replace(/\s/g, '').split('').map(Number);
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

/**
 * Schemas built with the shipped English copy.
 *
 * Kept as named exports so non-React callers (and the inferred form types) work
 * unchanged. Client Components should prefer `useSchemas()`, which overlays the
 * admin panel's wording.
 */
const shipped = createSchemas(VALIDATION_MESSAGES);

export const loginSchema = shipped.loginSchema;
export const registerSchema = shipped.registerSchema;
export const resetRequestSchema = shipped.resetRequestSchema;
export const resetCodeSchema = shipped.resetCodeSchema;
export const resetPasswordSchema = shipped.resetPasswordSchema;
export const addressSchema = shipped.addressSchema;
export const guestContactSchema = shipped.guestContactSchema;
export const paymentSchema = shipped.paymentSchema;
export const profileSchema = shipped.profileSchema;
export const promoSchema = shipped.promoSchema;

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetRequestFormData = z.infer<typeof resetRequestSchema>;
export type ResetCodeFormData = z.infer<typeof resetCodeSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type GuestContactFormData = z.infer<typeof guestContactSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PromoFormData = z.infer<typeof promoSchema>;
