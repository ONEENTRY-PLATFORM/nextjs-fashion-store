'use client'
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SectionTitle, EditBtn, Field, FormInput } from '../shared';
import { profileSchema } from '../../../utils/schemas';
import { PERSONAL_INFO_LABELS as L } from '../../../data/accountLabels';
import { PERSONAL_INFO_SECTION_ARIA } from '../../../data/commonLabels';

const primaryBtn = 'px-6 py-2.5 text-white text-xs tracking-[0.15em] uppercase focus-visible:outline-none bg-black rounded-none font-bold';
const secondaryBtn = 'px-6 py-2.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors border border-[#d1d5db] rounded-none';
const fieldLabel = 'block text-xs uppercase tracking-wide mb-1.5 font-semibold text-[#555]';

export function PersonalInfoSection() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    dob: user?.dob ?? '',
    shoeSize: user?.shoeSize ?? '',
    clothingSize: user?.clothingSize ?? '',
  });
  const [gender, setGender] = useState<'female' | 'male'>(user?.gender ?? 'female');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const save = async () => {
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const res = await updateProfile({
      firstName: form.firstName,
      phone: form.phone,
      gender,
      dob: form.dob,
      shoeSize: form.shoeSize,
      clothingSize: form.clothingSize,
    });
    setSaving(false);
    if (!res.ok) {
      setErrors({ firstName: res.error ?? 'Save failed' });
      return;
    }
    setEditing(false);
  };

  const patch = (key: keyof typeof form) => (v: string) => {
    setForm(f => ({ ...f, [key]: v }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  return (
    <div>
      <SectionTitle
        title={L.title}
        action={!editing && <EditBtn onClick={() => setEditing(true)} />}
      />
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label={L.labelFirstName} value={form.firstName} onChange={patch('firstName')} placeholder={L.placeholderFirstName} error={errors.firstName} />
            <FormInput label={L.labelEmail} value={form.email} onChange={patch('email')} type="email" placeholder={L.placeholderEmail} error={errors.email} />
            <FormInput label={L.labelPhone} value={form.phone} onChange={patch('phone')} type="tel" placeholder={L.placeholderPhone} error={errors.phone} />
            <FormInput label={L.labelDob} value={form.dob} onChange={v => setForm(f => ({ ...f, dob: v }))} type="date" />
            <FormInput label={L.labelShoeSize} value={form.shoeSize} onChange={v => setForm(f => ({ ...f, shoeSize: v }))} placeholder={L.placeholderShoeSize} />
            <FormInput label={L.labelClothingSize} value={form.clothingSize} onChange={v => setForm(f => ({ ...f, clothingSize: v }))} placeholder={L.placeholderClothingSize} />
          </div>
          <div>
            <label className={fieldLabel}>{L.labelGender}</label>
            <div className="flex w-48">
              {(['female', 'male'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  aria-pressed={gender === g}
                  className={`flex-1 py-2.5 text-xs capitalize tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-colors border rounded-none ${
                    g === 'male' ? '-ml-px' : ''
                  } ${
                    gender === g
                      ? 'border-black bg-black text-white font-bold'
                      : 'border-[#d1d5db] bg-white text-[#555] font-normal'
                  }`}
                >
                  {g === 'female' ? L.fieldGenderFemale : L.fieldGenderMale}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} aria-label={PERSONAL_INFO_SECTION_ARIA.save} className={primaryBtn + ' disabled:opacity-60 disabled:pointer-events-none'}>
              {L.saveChanges}
            </button>
            <button onClick={() => setEditing(false)} aria-label={PERSONAL_INFO_SECTION_ARIA.cancel} className={secondaryBtn}>
              {L.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label={L.fieldName} value={user.firstName} />
          <Field label={L.fieldEmail} value={user.email} />
          <Field label={L.fieldPhone} value={user.phone} />
          <Field label={L.fieldDob} value={user.dob ? new Date(user.dob).toLocaleDateString('en-GB') : L.fieldEmpty} />
          <Field label={L.fieldGender} value={user.gender === 'female' ? L.fieldGenderFemale : L.fieldGenderMale} />
          <Field label={L.fieldShoeSize} value={user.shoeSize} />
          <Field label={L.fieldClothingSize} value={user.clothingSize} />
        </div>
      )}
    </div>
  );
}
