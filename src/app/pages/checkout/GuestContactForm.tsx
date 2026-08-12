'use client';
import { FormField } from '@/app/components/ui/FormField';
import { GUEST_CONTACT_LABELS as L_FALLBACK } from '@/app/data/checkoutLabels';
import { SAVED_ADDRESS_FORM } from '@/lib/oneentry/checkout/forms';
import { useRoleField } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict } from '@/lib/oneentry/labels/DictContext';

export interface GuestContactFormState {
  fullName: string;
  email: string;
  phone: string;
}

interface GuestContactFormProps {
  form: GuestContactFormState;
  errors: Record<string, string>;
  onChange: (next: GuestContactFormState) => void;
  /** Optional intro line so admin can tweak wording per method. */
  helperText?: string;
  /**
   * CMS form these inputs are bound to — the order form of the chosen pickup
   *  method, whose contact attributes carry the limits the order is judged by.
   *  Defaults to the saved-address form for callers that predate the prop.
   */
  formMarker?: string;
}

export function GuestContactForm({
  form,
  errors,
  onChange,
  helperText,
  formMarker = SAVED_ADDRESS_FORM,
}: GuestContactFormProps) {
  const L = useDict('checkout_delivery_guest_', L_FALLBACK);
  const patch = (partial: Partial<GuestContactFormState>) => onChange({ ...form, ...partial });
  // Asked for by role, so an attribute rename in the admin panel does not blank
  // the inputs.
  const phFullName = useRoleField(formMarker, 'fullName', { placeholder: L.placeholderFullName }).placeholder;
  const phPhone = useRoleField(formMarker, 'phone', { placeholder: L.placeholderPhone }).placeholder;
  return (
    <div className="mt-4 border-t border-[#e5e7eb] pt-4">
      <p className="mb-1 text-xs font-semibold tracking-wide text-[#555] uppercase">{L.heading}</p>
      <p className="mb-4 text-xs text-gray-500">{helperText ?? L.defaultHint}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={L.labelFullName}
          placeholder={phFullName}
          autoComplete="name"
          value={form.fullName}
          onChange={(v) => patch({ fullName: v })}
          error={errors.fullName}
          testId="guest-fullName"
        />
        <FormField
          label={L.labelPhone}
          placeholder={phPhone}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(v) => patch({ phone: v })}
          error={errors.phone}
          testId="guest-phone"
        />
        <div className="sm:col-span-2">
          <FormField
            label={L.labelEmail}
            placeholder={L.placeholderEmail}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(v) => patch({ email: v })}
            error={errors.email}
            testId="guest-email"
          />
        </div>
      </div>
    </div>
  );
}
