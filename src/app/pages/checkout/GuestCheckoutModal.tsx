'use client';
import { LogIn, ShoppingBag, UserPlus, X } from 'lucide-react';

import { AUTH_LABELS } from '@/app/data/authLabels';
import { useT } from '@/lib/oneentry/labels/DictContext';

interface GuestCheckoutModalProps {
  onClose: () => void;
  onSignIn: () => void;
  onRegister: () => void;
  onContinueAsGuest: () => void;
}

export function GuestCheckoutModal({ onClose, onSignIn, onRegister, onContinueAsGuest }: GuestCheckoutModalProps) {
  const lEyebrow = useT('checkout_modal_sub_title', AUTH_LABELS.guestModalEyebrow);
  const lHeading = useT('checkout_modal_title', AUTH_LABELS.guestModalHeading);
  const lSignInTitle = useT('checkout_modal_sign_in_button_title', AUTH_LABELS.signIn.title);
  const lSignInText = useT('checkout_modal_sign_in_button_text', AUTH_LABELS.signIn.subtitle);
  const lCreateTitle = useT('checkout_modal_create_account_button_title', AUTH_LABELS.register.title);
  const lCreateText = useT('checkout_modal_create_account_button_text', AUTH_LABELS.register.subtitle);
  const lOr = useT('checkout_modal_or', AUTH_LABELS.divider);
  const lGuestTitle = useT('checkout_modal_continue_as_guest_button_title', AUTH_LABELS.guest.title);
  const lGuestText = useT('checkout_modal_continue_as_guest_button_text', AUTH_LABELS.guest.subtitle);
  return (
    <div className="fixed inset-0 z-400 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-8 py-6">
          <div>
            <p className="mb-0.5 text-xs tracking-[0.25em] text-gray-400 uppercase">{lEyebrow}</p>
            <h2 className="text-lg font-bold tracking-widest uppercase">{lHeading}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 transition-opacity hover:opacity-60 focus-visible:outline-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 px-8 py-6">
          <button
            onClick={onSignIn}
            className="group flex w-full items-center gap-4 border-2 border-black bg-black px-5 py-4 text-left text-white transition-colors hover:bg-[#222] focus-visible:outline-none"
          >
            <LogIn size={18} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm font-bold tracking-wide uppercase">{lSignInTitle}</p>
              <p className="mt-0.5 text-xs opacity-70">{lSignInText}</p>
            </div>
          </button>

          <button
            onClick={onRegister}
            className="flex w-full items-center gap-4 border-2 border-black bg-white px-5 py-4 text-left text-black transition-colors hover:bg-[#f9f9f9] focus-visible:outline-none"
          >
            <UserPlus size={18} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm font-bold tracking-wide uppercase">{lCreateTitle}</p>
              <p className="mt-0.5 text-xs text-gray-400">{lCreateText}</p>
            </div>
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-[#e5e7eb]" />
            <span className="text-xs tracking-widest text-gray-400 uppercase">{lOr}</span>
            <div className="flex-1 border-t border-[#e5e7eb]" />
          </div>

          <button
            onClick={onContinueAsGuest}
            data-testid="guest-continue"
            className="flex w-full items-center gap-4 border border-[#e5e7eb] bg-white px-5 py-4 text-left text-[#374151] transition-colors hover:bg-[#f9fafb] focus-visible:outline-none"
          >
            <ShoppingBag size={18} strokeWidth={1.5} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide uppercase">{lGuestTitle}</p>
              <p className="mt-0.5 text-xs text-gray-400">{lGuestText}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
