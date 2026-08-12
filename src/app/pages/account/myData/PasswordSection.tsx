'use client';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { EditBtn, FormInput, SectionTitle } from '@/app/pages/account/shared';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

// ─── My Data → Password section ─────────────────────────────────────────────
export const PASSWORD_LABELS = {
  title: 'Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  newPlaceholder: 'Min. 8 characters',
  confirmPlaceholder: 'Repeat password',
  currentPlaceholder: '••••••••',
  maskedDisplay: '••••••••••••',
  errorMismatch: 'Passwords do not match.',
  errorTooShort: 'Password must be at least 8 characters.',
  successMessage: 'Password updated successfully!',
  save: 'Save',
  cancel: 'Cancel',
} as const;

const primaryBtn =
  'px-6 py-2.5 text-white text-xs tracking-[0.15em] uppercase focus-visible:outline-none bg-black rounded-none font-bold';
const secondaryBtn =
  'px-6 py-2.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors border border-[#d1d5db] rounded-none';
const fieldLabel = 'block text-xs uppercase tracking-wide mb-1.5 font-semibold text-[#555]';

export function PasswordSection() {
  const L = useDict('users_edit_password_', PASSWORD_LABELS);
  const [editing, setEditing] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [currentPwFocused, setCurrentPwFocused] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lTitle = useT('users_edit_password_title', L.title);
  const lCurrent = useT('users_edit_password_current', L.currentPassword);
  const lNew = useT('users_edit_password_new_password', L.newPassword);
  const lConfirm = useT('users_edit_password_confirm_new_password', L.confirmNewPassword);
  const lSave = useT('users_edit_password_save_cta', L.save);
  const lCancel = useT('users_edit_password_cancel_cta', L.cancel);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = () => {
    if (!newPw || newPw !== confirmPw) {
      setMsg(L.errorMismatch);
      return;
    }
    if (newPw.length < 8) {
      setMsg(L.errorTooShort);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg(L.successMessage);
    timerRef.current = setTimeout(() => {
      setMsg('');
      setEditing(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }, 1500);
  };

  return (
    <div>
      <SectionTitle title={lTitle} action={!editing && <EditBtn onClick={() => setEditing(true)} />} />
      {editing ? (
        <div className="max-w-sm space-y-4">
          <div className="relative">
            <label className={fieldLabel}>{lCurrent}</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder={L.currentPlaceholder}
              className={`w-full rounded-none border px-3 py-2.5 pr-10 text-sm outline-none ${
                currentPwFocused ? 'border-black' : 'border-[#d1d5db]'
              }`}
              onFocus={() => setCurrentPwFocused(true)}
              onBlur={() => setCurrentPwFocused(false)}
            />
            <button
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 bottom-3 text-gray-400 focus-visible:outline-none"
            >
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <FormInput label={lNew} value={newPw} onChange={setNewPw} type="password" placeholder={L.newPlaceholder} />
          <FormInput
            label={lConfirm}
            value={confirmPw}
            onChange={setConfirmPw}
            type="password"
            placeholder={L.confirmPlaceholder}
          />
          {msg && <p className={`text-xs ${msg.includes('success') ? 'text-green-600' : 'text-(--sale)'}`}>{msg}</p>}
          <div className="flex gap-3">
            <button onClick={save} className={primaryBtn}>
              {lSave}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setMsg('');
              }}
              className={secondaryBtn}
            >
              {lCancel}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{L.maskedDisplay}</p>
      )}
    </div>
  );
}
