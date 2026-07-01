'use client'
import { X, LogIn, UserPlus, ShoppingBag } from 'lucide-react';
import { AUTH_LABELS } from '../../data/authLabels';
import { useT } from '../../../lib/oneentry/labels/CheckoutLabelsContext';

interface GuestCheckoutModalProps {
  onClose: () => void;
  onSignIn: () => void;
  onRegister: () => void;
  onContinueAsGuest: () => void;
}

export function GuestCheckoutModal({ onClose, onSignIn, onRegister, onContinueAsGuest }: GuestCheckoutModalProps) {
  const lEyebrow      = useT('checkout_modal', 'checkout_modal_sub_title',                       AUTH_LABELS.guestModalEyebrow);
  const lHeading      = useT('checkout_modal', 'checkout_modal_title',                           AUTH_LABELS.guestModalHeading);
  const lSignInTitle  = useT('checkout_modal', 'checkout_modal_sign_in_button_title',            AUTH_LABELS.signIn.title);
  const lSignInText   = useT('checkout_modal', 'checkout_modal_sign_in_button_text',             AUTH_LABELS.signIn.subtitle);
  const lCreateTitle  = useT('checkout_modal', 'checkout_modal_create_account_button_title',     AUTH_LABELS.register.title);
  const lCreateText   = useT('checkout_modal', 'checkout_modal_create_account_button_text',      AUTH_LABELS.register.subtitle);
  const lOr           = useT('checkout_modal', 'checkout_modal_or',                              AUTH_LABELS.divider);
  const lGuestTitle   = useT('checkout_modal', 'checkout_modal_continue_as_guest_button_title',  AUTH_LABELS.guest.title);
  const lGuestText    = useT('checkout_modal', 'checkout_modal_continue_as_guest_button_text',   AUTH_LABELS.guest.subtitle);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md font-[Inter,sans-serif]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#e5e7eb]">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-gray-400 mb-0.5">{lEyebrow}</p>
            <h2 className="text-lg tracking-[0.1em] uppercase font-bold">{lHeading}</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:opacity-60 transition-opacity focus-visible:outline-none ml-4 flex-shrink-0"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Options */}
        <div className="px-8 py-6 space-y-3">
          <button
            onClick={onSignIn}
            className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none group border-2 border-black bg-black text-white hover:bg-[#222]"
          >
            <LogIn size={18} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm tracking-wide uppercase font-bold">{lSignInTitle}</p>
              <p className="text-xs mt-0.5 opacity-70">{lSignInText}</p>
            </div>
          </button>

          <button
            onClick={onRegister}
            className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none border-2 border-black bg-white text-black hover:bg-[#f9f9f9]"
          >
            <UserPlus size={18} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm tracking-wide uppercase font-bold">{lCreateTitle}</p>
              <p className="text-xs mt-0.5 text-gray-400">{lCreateText}</p>
            </div>
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-[#e5e7eb]" />
            <span className="text-xs text-gray-400 tracking-widest uppercase">{lOr}</span>
            <div className="flex-1 border-t border-[#e5e7eb]" />
          </div>

          <button
            onClick={onContinueAsGuest}
            className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]"
          >
            <ShoppingBag size={18} strokeWidth={1.5} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-sm tracking-wide uppercase font-semibold">{lGuestTitle}</p>
              <p className="text-xs mt-0.5 text-gray-400">{lGuestText}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
