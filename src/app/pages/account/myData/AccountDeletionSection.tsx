'use client';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { SectionTitle } from '@/app/pages/account/shared';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useList } from '@/lib/oneentry/labels/DictContext';

// ─── My Data → Account Deletion section ─────────────────────────────────────
export const ACCOUNT_DELETION_LABELS = {
  title: 'Account Deletion',
  warningTitle: 'Warning: This action is permanent',
  warningPoints: [
    'Your loyalty card will be permanently blocked',
    'All discounts and bonuses will be reset to zero',
    'Service maintenance access will be revoked',
    'Your card cannot be restored after deletion',
  ] as readonly string[],
  supportLabel: 'For assistance, call us at',
  supportPhone: '+44 20 7946 0958',
  ctaDelete: 'Delete Account',
  confirmHeading: 'Are you absolutely sure?',
  ctaConfirmDelete: 'Yes, Delete My Account',
  ctaCancel: 'Cancel',
} as const;

const L_FALLBACK = ACCOUNT_DELETION_LABELS;

export function AccountDeletionSection() {
  const L = useDict('user_account_deletion_', L_FALLBACK);
  // An array is structure to `mergeDict`, so the consequences of deleting an account were the one part of this warning an editor could not touch.
  const warningPoints = useList('user_account_deletion_warning_points', L.warningPoints);
  const { logout } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
      <SectionTitle title={L.title} />
      <div className="space-y-4 border border-[#fee2e2] bg-[#fff8f8] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-(--sale)" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-(--sale)">{L.warningTitle}</p>
            <ul className="space-y-1 text-xs text-gray-600">
              {warningPoints.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
            <p className="pt-1 text-xs text-gray-400">
              {L.supportLabel}{' '}
              <a href={`tel:${L.supportPhone.replace(/\s/g, '')}`} className="underline">
                {L.supportPhone}
              </a>
            </p>
          </div>
        </div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-none bg-(--sale) px-6 py-2.5 text-xs font-bold tracking-[0.15em] text-white uppercase transition-colors hover:bg-red-600 focus-visible:outline-none"
          >
            {L.ctaDelete}
          </button>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold">{L.confirmHeading}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="rounded-none bg-(--sale) px-6 py-2.5 text-xs font-bold tracking-[0.15em] text-white uppercase focus-visible:outline-none"
              >
                {L.ctaConfirmDelete}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-none border border-[#d1d5db] px-6 py-2.5 text-xs tracking-[0.15em] uppercase hover:bg-gray-50 focus-visible:outline-none"
              >
                {L.ctaCancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
