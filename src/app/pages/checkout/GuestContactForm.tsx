'use client';
import { FormField } from '@/app/components/ui/FormField';
import { GUEST_CONTACT_LABELS as L_FALLBACK } from '@/app/data/checkoutLabels';
import { useFieldPlaceholder } from '@/lib/oneentry/forms/FormPlaceholdersContext';
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
}

export function GuestContactForm({ form, errors, onChange, helperText }: GuestContactFormProps) {
  const L = useDict('checkout_delivery_guest_', L_FALLBACK);
  const patch = (partial: Partial<GuestContactFormState>) => onChange({ ...form, ...partial });
  const phFullName = useFieldPlaceholder('user_addresses', 'user_addresses_recipient_name', L.placeholderFullName);
  const phPhone = useFieldPlaceholder('user_addresses', 'user_addresses_recipient_phone', L.placeholderPhone);
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
