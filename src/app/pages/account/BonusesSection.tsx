'use client'
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { SectionTitle, ACCENT } from './shared';
import { SALE_COLOR } from '../../constants/colors';
import { BONUSES_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

export function BonusesSection() {
  const { user } = useAuth();
  // No OE source for bonus transactions in this tenant — empty list.
  const bonusHistory: Array<{ date: string; desc: string; pts: string; sign: 1 | -1 }> = [];
  const title       = useT('my_bonuses', 'my_bonuses_title',                  L.title);
  const available   = useT('my_bonuses', 'my_bonuses_available_bonuses',      L.availableBonuses);
  const discountLvl = useT('my_bonuses', 'my_bonuses_discount_level',         L.discountLevel);
  const txHistory   = useT('my_bonuses', 'my_bonuses_transaction_history_title', L.transactionHistory);
  return (
    <div
      style={{ '--accent': ACCENT, '--sale': SALE_COLOR } as React.CSSProperties}
    >
      <SectionTitle title={title} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { label: available,   value: (user?.bonuses ?? 0).toLocaleString(), accent: true },
          { label: discountLvl, value: `${user?.discount ?? 0}%`,             accent: false },
        ].map(stat => (
          <div key={stat.label} className="p-5 text-center border border-[#e5e7eb]">
            <p className={`text-3xl mb-1 font-bold ${stat.accent ? 'text-[var(--accent)]' : 'text-black'}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-widest mb-4 font-bold text-gray-400">{txHistory}</h4>
        <div className="space-y-2">
          {bonusHistory.map((tx) => (
            <div key={`${tx.date}-${tx.desc}-${tx.pts}`} className="flex items-center justify-between px-4 py-3 border border-[#e5e7eb]">
              <div>
                <p className="text-sm font-medium">{tx.desc}</p>
                <p className="text-xs text-gray-400">{tx.date}</p>
              </div>
              <span className={`text-sm font-bold ${tx.sign > 0 ? 'text-[#16a34a]' : 'text-[var(--sale)]'}`}>{tx.pts} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
