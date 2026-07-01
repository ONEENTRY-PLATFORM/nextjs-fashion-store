'use client'
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { SectionTitle, FormInput } from '../shared';
import { ADDRESSES_LABELS as L } from '../../../data/accountLabels';
import { ADDRESSES_SECTION_ARIA } from '../../../data/commonLabels';
import { useT } from '../../../../lib/oneentry/labels/AccountLabelsContext';
import { useFormPlaceholder } from '../../../../lib/oneentry/forms/FormPlaceholdersContext';

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
const primaryBtn = 'px-5 py-2 text-white text-xs tracking-wider uppercase focus-visible:outline-none bg-black rounded-none font-semibold';
const secondaryBtn = 'px-5 py-2 text-xs tracking-wider uppercase focus-visible:outline-none hover:bg-gray-50 border border-[#d1d5db] rounded-none';

export function AddressesSection() {
  const { user, updateAddresses } = useAuth();
  const addresses = user?.addresses ?? [];
  const [mode, setMode] = useState<'idle' | 'add' | string>('idle');
  const [form, setForm] = useState<AddrForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lNewHeading  = useT('user_addresses_system', 'user_addresses_system_title',           L.newAddressHeading);
  const lEditHeading = useT('user_addresses_system', 'user_addresses_system_edit_title',      L.editAddressHeading);
  const lAdd         = useT('user_addresses_system', 'user_addresses_system_add_cta',         L.add);
  const lSave        = useT('user_addresses_system', 'user_addresses_system_save_cta',        L.save);
  const lCancel      = useT('user_addresses_system', 'user_addresses_system_cancel_cta',      L.cancel);

  const phLabel        = useFormPlaceholder('user_addresses', 'user_addresses_lable',                'placeholder_label',                L.placeholderLabel);
  const phFullName     = useFormPlaceholder('user_addresses', 'user_addresses_recipient_name',       'placeholder_name',                 L.placeholderFullName);
  const phPhone        = useFormPlaceholder('user_addresses', 'user_addresses_recipient_phone',      'placeholder_phone',                L.placeholderPhone);
  const phAddressLine1 = useFormPlaceholder('user_addresses', 'user_addresses_line_1',               'placeholder_address_line_1',       L.placeholderAddressLine1);
  const phCity         = useFormPlaceholder('user_addresses', 'user_addresses_city',                 'placeholder_city',                 L.placeholderCity);
  const phPostalCode   = useFormPlaceholder('user_addresses', 'user_addresses_post_code',            'placeholder_postal_code',          L.placeholderPostalCode);
  const phInstructions = useFormPlaceholder('user_addresses', 'user_addresses_special_instructions', 'placeholder_special_instructions', L.placeholderInstructions);

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

  const buildFull = (f: AddrForm) =>
    `${f.fullName} · ${f.line1}, ${f.city} ${f.postcode} · ${f.phone}`;

  const save = async () => {
    if (!validate()) return;
    const next = mode === 'add'
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
      : addresses.map(x => x.id === mode
          ? { ...x, name: form.name || x.name, fullName: form.fullName, phone: form.phone.replace(/\s+/g, ''), line1: form.line1, city: form.city, postcode: form.postcode, instructions: form.instructions, full: buildFull(form) }
          : x);
    const res = await updateAddresses(next);
    if (!res.ok) {
      setErrors({ fullName: res.error ?? 'Save failed' });
      return;
    }
    setMode('idle');
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const openEdit = (addr: typeof addresses[0]) => {
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
    setForm(f => ({ ...f, [key]: v }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const renderForm = (heading: string, saveLabel: string) => (
    <div className="p-4 space-y-3 border border-black">
      <p className="text-xs uppercase tracking-wide font-bold text-[#555]">{heading}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormInput label={L.labelLabel} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder={phLabel} />
        <FormInput label={L.labelFullName} value={form.fullName} onChange={patch('fullName')} placeholder={phFullName} error={errors.fullName} />
        <FormInput label={L.labelPhone} type="tel" value={form.phone} onChange={patch('phone')} placeholder={phPhone} error={errors.phone} />
        <div className="sm:col-span-2">
          <FormInput label={L.labelAddressLine1} value={form.line1} onChange={patch('line1')} placeholder={phAddressLine1} error={errors.line1} />
        </div>
        <FormInput label={L.labelCity} value={form.city} onChange={patch('city')} placeholder={phCity} error={errors.city} />
        <FormInput label={L.labelPostalCode} value={form.postcode} onChange={patch('postcode')} placeholder={phPostalCode} error={errors.postcode} />
        <div className="sm:col-span-2">
          <FormInput label={L.labelInstructions} value={form.instructions} onChange={v => setForm(f => ({ ...f, instructions: v }))} placeholder={phInstructions} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} className={primaryBtn}>{saveLabel}</button>
        <button onClick={() => { setMode('idle'); setErrors({}); }} className={secondaryBtn}>{lCancel}</button>
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
              onClick={() => { setForm(EMPTY_FORM); setErrors({}); setMode('add'); }}
              className="flex items-center gap-1.5 text-xs tracking-wide focus-visible:outline-none hover:opacity-70 transition-opacity font-semibold"
            >
              <Plus size={12} /> {L.addAddress}
            </button>
          ) : null
        }
      />
      <div className="space-y-3">
        {addresses.map(addr => (
          <div key={addr.id}>
            {mode === addr.id ? (
              renderForm(lEditHeading, lSave)
            ) : (
              <div className="flex items-start justify-between gap-4 p-4 border border-[#e5e7eb]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={12} className="text-[var(--accent)]" />
                    <p className="text-xs uppercase tracking-wide font-bold">{addr.name}</p>
                  </div>
                  <p className="text-sm text-gray-600">{addr.full}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    className="focus-visible:outline-none hover:opacity-60 transition-opacity text-gray-400"
                    onClick={() => openEdit(addr)}
                    aria-label={ADDRESSES_SECTION_ARIA.editAddress}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="focus-visible:outline-none hover:opacity-60 transition-opacity text-[var(--sale)]"
                    onClick={() => { void updateAddresses(addresses.filter(x => x.id !== addr.id)); }}
                    aria-label={ADDRESSES_SECTION_ARIA.deleteAddress}
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
