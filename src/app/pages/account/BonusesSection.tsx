'use client'
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SectionTitle, ACCENT } from './shared';
import { SALE_COLOR } from '../../constants/colors';
import { BONUSES_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';
import { fetchBonusHistoryAction, type OeBonusTransaction } from '../../../lib/oneentry/auth/actions';

const TYPE_LABELS: Record<string, string> = {
  ACCRUAL: 'Earned',
  REVERSAL_USAGE: 'Refunded',
  USAGE: 'Spent on order',
  REDUCE: 'Adjustment',
  REVERSAL_ACCRUAL: 'Accrual reversed',
  EXPIRATION: 'Expired',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function BonusesSection() {
  const { user, isLoggedIn } = useAuth();
  const [history, setHistory] = useState<OeBonusTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const title       = useT('my_bonuses', 'my_bonuses_title',                  L.title);
  const available   = useT('my_bonuses', 'my_bonuses_available_bonuses',      L.availableBonuses);
  const discountLvl = useT('my_bonuses', 'my_bonuses_discount_level',         L.discountLevel);
  const txHistory   = useT('my_bonuses', 'my_bonuses_transaction_history_title', L.transactionHistory);

  useEffect(() => {
    if (!isLoggedIn) {
      setHistory([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBonusHistoryAction().then((list) => {
      if (cancelled) return;
      setHistory(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

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
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[54px] border border-[#e5e7eb] bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">No bonus transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((tx, idx) => {
              const desc = tx.comment?.trim() || TYPE_LABELS[tx.type] || tx.type;
              return (
                <div
                  key={`${tx.createdAt ?? idx}-${tx.type}-${tx.amount}`}
                  className="flex items-center justify-between px-4 py-3 border border-[#e5e7eb]"
                >
                  <div>
                    <p className="text-sm font-medium">{desc}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.sign > 0 ? 'text-[#16a34a]' : 'text-[var(--sale)]'}`}>
                    {tx.sign > 0 ? '+' : '−'}{tx.amount.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
