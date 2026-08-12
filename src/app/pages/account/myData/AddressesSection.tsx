'use client';
import { Edit2, MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { FormInput, SectionTitle } from '@/app/pages/account/shared';
import { useFormMessages } from '@/app/utils/useFormMessages';
import { SAVED_ADDRESS_FORM } from '@/lib/oneentry/checkout/forms';
import { useRoleField } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const ADDRESSES_SECTION_ARIA = {
  editAddress: 'Edit address',
  deleteAddress: 'Delete address',
} as const;

// ─── My Data → Addresses section ────────────────────────────────────────────
export const ADDRESSES_LABELS = {
  title: 'My Addresses',
  addAddress: 'Add Address',
  newAddressHeading: 'New Address',
  editAddressHeading: 'Edit Address',
  save: 'Save',
  add: 'Add',
  cancel: 'Cancel',
  errorRequired: 'Required',
  errorInvalidPhone: 'Enter a valid phone number',
  labelLabel: 'Label (e.g. Home, Office)',
  labelFullName: 'Full Name',
  labelPhone: 'Phone',
  labelAddressLine1: 'Address Line 1',
  labelCity: 'City',
  labelPostalCode: 'Postal Code',
  labelInstructions: 'Special Instructions (optional)',
  placeholderLabel: 'Home',
  placeholderFullName: 'Jane Smith',
  placeholderPhone: '+44 20 0000 0000',
  placeholderAddressLine1: 'Street name and number',
  placeholderCity: 'London',
  placeholderPostalCode: 'SW1A 1AA',
  placeholderInstructions: 'Gate code, floor, etc.',
} as const;

type AddrForm = {
  name: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  instructions: string;
};

const EMPTY_FORM: AddrForm = { name: '', fullName: '', phone: '', line1: '', city: '', postcode: '', instructions: '' };
const primaryBtn =
  'px-5 py-2 text-white text-xs tracking-wider uppercase focus-visible:outline-none bg-black rounded-none font-semibold';
const secondaryBtn =
  'px-5 py-2 text-xs tracking-wider uppercase focus-visible:outline-none hover:bg-gray-50 border border-[#d1d5db] rounded-none';

export function AddressesSection() {
  const L = useDict('user_addresses_system_', ADDRESSES_LABELS);
  const M = useFormMessages();
  const { user, updateAddresses } = useAuth();
  const addresses = user?.addresses ?? [];
  const [mode, setMode] = useState<'idle' | 'add' | string>('idle');
  const [form, setForm] = useState<AddrForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const aEditAddress = useT('user_account_aria_edit_address', ADDRESSES_SECTION_ARIA.editAddress);
  const aDeleteAddress = useT('user_account_aria_delete_address', ADDRESSES_SECTION_ARIA.deleteAddress);
  const lNewHeading = useT('user_addresses_system_title', L.newAddressHeading);
  const lEditHeading = useT('user_addresses_system_edit_title', L.editAddressHeading);
  const lAdd = useT('user_addresses_system_add_cta', L.add);
  const lSave = useT('user_addresses_system_save_cta', L.save);
  const lCancel = useT('user_addresses_system_cancel_cta', L.cancel);

  // Labels come from the form's own attribute titles — the field copy belongs
  // to the form entity in OE, not to a system-text set. `ADDRESSES_LABELS`
  // stays the offline fallback.
  // Label and placeholder of each input come from the attribute an editor
  // tagged with that role, so both the copy and the marker behind it can change
  // in the admin panel without a deploy.
  const fLabel = useRoleField(SAVED_ADDRESS_FORM, 'label', { label: L.labelLabel, placeholder: L.placeholderLabel });
  const fFullName = useRoleField(SAVED_ADDRESS_FORM, 'fullName', {
    label: L.labelFullName,
    placeholder: L.placeholderFullName,
  });
  const fPhone = useRoleField(SAVED_ADDRESS_FORM, 'phone', { label: L.labelPhone, placeholder: L.placeholderPhone });
  const fAddressLine1 = useRoleField(SAVED_ADDRESS_FORM, 'line1', {
    label: L.labelAddressLine1,
    placeholder: L.placeholderAddressLine1,
  });
  const fCity = useRoleField(SAVED_ADDRESS_FORM, 'city', { label: L.labelCity, placeholder: L.placeholderCity });
  const fPostalCode = useRoleField(SAVED_ADDRESS_FORM, 'postcode', {
    label: L.labelPostalCode,
    placeholder: L.placeholderPostalCode,
  });
  const fInstructions = useRoleField(SAVED_ADDRESS_FORM, 'instructions', {
    label: L.labelInstructions,
    placeholder: L.placeholderInstructions,
  });

  const validate = () => {
    const phoneRegex = /^\+?[\d\s\-()\[\]]{7,20}$/;
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = L.errorRequired;
    if (!form.phone.trim()) next.phone = L.errorRequired;
    else if (!phoneRegex.test(form.phone.trim())) next.phone = L.errorInvalidPhone;
    if (!form.line1.trim()) next.line1 = L.errorRequired;
    if (!form.city.trim()) next.city = L.errorRequired;
    if (!form.postcode.trim()) next.postcode = L.errorRequired;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildFull = (f: AddrForm) => `${f.fullName} · ${f.line1}, ${f.city} ${f.postcode} · ${f.phone}`;

  const save = async () => {
    if (!validate()) return;
    const next =
      mode === 'add'
        ? [
            ...addresses,
            {
              id: `a${crypto.randomUUID().slice(0, 8)}`,
              name: form.name || 'New',
              fullName: form.fullName,
              phone: form.phone.replace(/\s+/g, ''),
              line1: form.line1,
              city: form.city,
              postcode: form.postcode,
              instructions: form.instructions,
              full: buildFull(form),
            },
          ]
        : addresses.map((x) =>
            x.id === mode
              ? {
                  ...x,
                  name: form.name || x.name,
                  fullName: form.fullName,
                  phone: form.phone.replace(/\s+/g, ''),
                  line1: form.line1,
                  city: form.city,
                  postcode: form.postcode,
                  instructions: form.instructions,
                  full: buildFull(form),
                }
              : x,
          );
    const res = await updateAddresses(next);
    if (!res.ok) {
      setErrors({ fullName: res.error ?? M.saveFailed });
      return;
    }
    setMode('idle');
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const openEdit = (addr: (typeof addresses)[0]) => {
    setForm({
      name: addr.name,
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      city: addr.city,
      postcode: addr.postcode,
      instructions: addr.instructions ?? '',
    });
    setErrors({});
    setMode(addr.id);
  };

  const patch = (key: keyof AddrForm) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const renderForm = (heading: string, saveLabel: string) => (
    <div className="space-y-3 border border-black p-4">
      <p className="text-xs font-bold tracking-wide text-[#555] uppercase">{heading}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput
          label={fLabel.label}
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder={fLabel.placeholder}
        />
        <FormInput
          label={fFullName.label}
          value={form.fullName}
          onChange={patch('fullName')}
          placeholder={fFullName.placeholder}
          error={errors.fullName}
        />
        <FormInput
          label={fPhone.label}
          type="tel"
          value={form.phone}
          onChange={patch('phone')}
          placeholder={fPhone.placeholder}
          error={errors.phone}
        />
        <div className="sm:col-span-2">
          <FormInput
            label={fAddressLine1.label}
            value={form.line1}
            onChange={patch('line1')}
            placeholder={fAddressLine1.placeholder}
            error={errors.line1}
          />
        </div>
        <FormInput
          label={fCity.label}
          value={form.city}
          onChange={patch('city')}
          placeholder={fCity.placeholder}
          error={errors.city}
        />
        <FormInput
          label={fPostalCode.label}
          value={form.postcode}
          onChange={patch('postcode')}
          placeholder={fPostalCode.placeholder}
          error={errors.postcode}
        />
        <div className="sm:col-span-2">
          <FormInput
            label={fInstructions.label}
            value={form.instructions}
            onChange={(v) => setForm((f) => ({ ...f, instructions: v }))}
            placeholder={fInstructions.placeholder}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} className={primaryBtn}>
          {saveLabel}
        </button>
        <button
          onClick={() => {
            setMode('idle');
            setErrors({});
          }}
          className={secondaryBtn}
        >
          {lCancel}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <SectionTitle
        title={L.title}
        action={
          mode === 'idle' ? (
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setErrors({});
                setMode('add');
              }}
              className="flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-opacity hover:opacity-70 focus-visible:outline-none"
            >
              <Plus size={12} /> {L.addAddress}
            </button>
          ) : null
        }
      />
      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id}>
            {mode === addr.id ? (
              renderForm(lEditHeading, lSave)
            ) : (
              <div className="flex items-start justify-between gap-4 border border-[#e5e7eb] p-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <MapPin size={12} className="text-accent" />
                    <p className="text-xs font-bold tracking-wide uppercase">{addr.name}</p>
                  </div>
                  <p className="text-sm text-gray-600">{addr.full}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="text-gray-400 transition-opacity hover:opacity-60 focus-visible:outline-none"
                    onClick={() => openEdit(addr)}
                    aria-label={aEditAddress}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="text-(--sale) transition-opacity hover:opacity-60 focus-visible:outline-none"
                    onClick={() => {
                      void updateAddresses(addresses.filter((x) => x.id !== addr.id));
                    }}
                    aria-label={aDeleteAddress}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {mode === 'add' && renderForm(lNewHeading, lAdd)}
      </div>
    </div>
  );
}
