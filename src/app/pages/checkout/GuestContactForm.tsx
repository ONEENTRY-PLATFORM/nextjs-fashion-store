'use client'
import { FormField } from '../../components/FormField';
import { GUEST_CONTACT_LABELS as L } from '../../data/checkoutLabels';
import { useFormPlaceholder } from '../../../lib/oneentry/forms/FormPlaceholdersContext';

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
  const patch = (partial: Partial<GuestContactFormState>) => onChange({ ...form, ...partial });
  const phFullName = useFormPlaceholder('user_addresses', 'user_addresses_recipient_name',  'placeholder_name',  L.placeholderFullName);
  const phPhone    = useFormPlaceholder('user_addresses', 'user_addresses_recipient_phone', 'placeholder_phone', L.placeholderPhone);
  return (
    <div className="pt-4 border-t border-[#e5e7eb] mt-4">
      <p className="text-xs tracking-wide uppercase mb-1 font-semibold text-[#555]">
        {L.heading}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {helperText ?? L.defaultHint}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label={L.labelFullName}
          placeholder={phFullName}
          autoComplete="name"
          value={form.fullName}
          onChange={v => patch({ fullName: v })}
          error={errors.fullName}
        />
        <FormField
          label={L.labelPhone}
          placeholder={phPhone}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={v => patch({ phone: v })}
          error={errors.phone}
        />
        <div className="sm:col-span-2">
          <FormField
            label={L.labelEmail}
            placeholder={L.placeholderEmail}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={v => patch({ email: v })}
            error={errors.email}
          />
        </div>
      </div>
    </div>
  );
}
