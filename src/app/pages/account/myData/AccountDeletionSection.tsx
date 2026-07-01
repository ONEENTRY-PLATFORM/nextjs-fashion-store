'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { SectionTitle } from '../shared';
import { ACCOUNT_DELETION_LABELS as L } from '../../../data/accountLabels';

export function AccountDeletionSection() {
  const { logout } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
      <SectionTitle title={L.title} />
      <div className="p-5 space-y-4 border border-[#fee2e2] bg-[#fff8f8]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-[var(--sale)]" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[var(--sale)]">{L.warningTitle}</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {L.warningPoints.map(point => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 pt-1">
              {L.supportLabel} <a href={`tel:${L.supportPhone.replace(/\s/g, '')}`} className="underline">{L.supportPhone}</a>
            </p>
          </div>
        </div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none hover:bg-red-600 transition-colors bg-[var(--sale)] text-white rounded-none font-bold"
          >
            {L.ctaDelete}
          </button>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold">{L.confirmHeading}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none bg-[var(--sale)] text-white rounded-none font-bold"
              >
                {L.ctaConfirmDelete}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-6 py-2.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none hover:bg-gray-50 border border-[#d1d5db] rounded-none"
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
