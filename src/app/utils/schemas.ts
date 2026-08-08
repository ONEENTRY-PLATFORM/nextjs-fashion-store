import { z } from 'zod';
import { VALIDATION_MESSAGES, type ValidationMessages } from '../data/validationMessages';

/** Shape of the message table the schemas are built from. */
export type FormMessages = ValidationMessages;

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
 * @param   {FormMessages} M - Error messages, CMS values or the shipped copy.
 * @returns The seven form schemas, built with those messages.
 */
export function createSchemas(M: FormMessages) {
  // ─── Reusable field validators ──────────────────────────────────────────────

  const emailSchema = z
    .string()
    .min(1, M.emailRequired)
    .email(M.emailInvalid);

  const passwordSchema = z
    .string()
    .min(8, M.passwordTooShort)
    .max(128, M.passwordTooLong);

  const phoneSchema = z
    .string()
    .min(1, M.phoneRequired)
    .regex(/^\+?[\d\s\-()\[\]]{7,20}$/, M.phoneInvalid);

  const postcodeSchema = z
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
        val =>
          val.includes('@')
            || /^\+?[\d\s\-()\[\]]{7,20}$/.test(val)
            || /^[A-Za-z0-9._-]{3,80}$/.test(val),
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
    .refine(data => data.password === data.confirmPassword, {
      message: M.passwordsMismatch,
      path: ['confirmPassword'],
    });

  // ─── Address (Delivery page) ────────────────────────────────────────────────

  const addressSchema = z.object({
    fullName: z.string().min(1, M.fullNameRequired).max(100),
    phone: phoneSchema,
    line1: z.string().min(1, M.address1Required).max(200),
    city: z.string().min(1, M.cityRequired).max(100),
    postcode: postcodeSchema,
    instructions: z.string().max(500).optional(),
  });

  // ─── Guest contact (Store pickup / Parcel locker, when not logged in) ───────

  const guestContactSchema = z.object({
    fullName: z.string().min(1, M.fullNameRequired).max(100),
    email: emailSchema,
    phone: phoneSchema,
  });

  // ─── Payment card ───────────────────────────────────────────────────────────

  const paymentSchema = z.object({
    cardNumber: z
      .string()
      .min(1, M.cardNumberRequired)
      .refine(val => /^[\d\s]{13,19}$/.test(val), M.cardNumberInvalid)
      .refine(val => luhn(val), M.cardNumberBad),
    expiry: z
      .string()
      .min(1, M.expiryRequired)
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, M.expiryFormat)
      .refine(val => {
        const [mm, yy] = val.split('/').map(Number);
        const now = new Date();
        const exp = new Date(2000 + yy, mm - 1);
        return exp >= new Date(now.getFullYear(), now.getMonth());
      }, M.expiryExpired),
    cvv: z
      .string()
      .min(1, M.cvvRequired)
      .regex(/^\d{3,4}$/, M.cvvFormat),
    nameOnCard: z
      .string()
      .min(1, M.nameOnCardRequired)
      .max(100),
  });

  // ─── Profile (My Data) ─────────────────────────────────────────────────────

  const profileSchema = z.object({
    firstName: z.string().min(1, M.firstNameRequired).max(60),
    email: emailSchema,
    phone: z.string().refine(
      val => val === '' || /^\+?[\d\s\-()\[\]]{7,20}$/.test(val),
      M.phoneInvalid,
    ),
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
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
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
export const addressSchema = shipped.addressSchema;
export const guestContactSchema = shipped.guestContactSchema;
export const paymentSchema = shipped.paymentSchema;
export const profileSchema = shipped.profileSchema;
export const promoSchema = shipped.promoSchema;

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type GuestContactFormData = z.infer<typeof guestContactSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PromoFormData = z.infer<typeof promoSchema>;
