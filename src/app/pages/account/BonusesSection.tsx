'use client';
import React, { useEffect, useMemo, useState } from 'react';

import { fetchBonusHistoryAction, type OeBonusTransaction } from '../../../lib/oneentry/auth/actions';
import { useT } from '../../../lib/oneentry/labels/DictContext';
import { SALE_COLOR } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { BONUSES_LABELS as L } from '../../data/accountLabels';
import { ACCENT, SectionTitle } from './shared';

/**
 * Built from the OE `my_bonuses` set so an editor can reword a transaction
 *  type; the local dictionary is the offline fallback.
 */
function useTypeLabels(): Record<string, string> {
  const accrual = useT('my_bonuses_type_accrual', L.typeAccrual);
  const reversalUsage = useT('my_bonuses_type_reversal_usage', L.typeReversalUsage);
  const usage = useT('my_bonuses_type_usage', L.typeUsage);
  const reduce = useT('my_bonuses_type_reduce', L.typeReduce);
  const reversalAccrual = useT('my_bonuses_type_reversal_accrual', L.typeReversalAccrual);
  const expiration = useT('my_bonuses_type_expiration', L.typeExpiration);
  return useMemo(
    () => ({
      ACCRUAL: accrual,
      REVERSAL_USAGE: reversalUsage,
      USAGE: usage,
      REDUCE: reduce,
      REVERSAL_ACCRUAL: reversalAccrual,
      EXPIRATION: expiration,
    }),
    [accrual, reversalUsage, usage, reduce, reversalAccrual, expiration],
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function BonusesSection() {
  const { user, isLoggedIn } = useAuth();
  // Result carries the session it belongs to, so signing out invalidates it
  // during render instead of needing an effect to reset the list (a
  // synchronous `setState` in `useEffect` — see MCP `common-mistakes`).
  const [loaded, setLoaded] = useState<{ signedIn: boolean; items: OeBonusTransaction[] } | null>(null);
  const history = loaded?.signedIn === isLoggedIn ? loaded.items : [];
  const loading = isLoggedIn && loaded?.signedIn !== true;
  const title = useT('my_bonuses_title', L.title);
  const available = useT('my_bonuses_available_bonuses', L.availableBonuses);
  const discountLvl = useT('my_bonuses_discount_level', L.discountLevel);
  const lEmptyHistory = useT('my_bonuses_empty_history', L.emptyHistory);
  const TYPE_LABELS = useTypeLabels();
  const txHistory = useT('my_bonuses_transaction_history_title', L.transactionHistory);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void fetchBonusHistoryAction().then((list) => {
      if (cancelled) return;
      setLoaded({ signedIn: true, items: list });
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  return (
    <div style={{ '--accent': ACCENT, '--sale': SALE_COLOR } as React.CSSProperties}>
      <SectionTitle title={title} />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: available, value: (user?.bonuses ?? 0).toLocaleString(), accent: true },
          { label: discountLvl, value: `${user?.discount ?? 0}%`, accent: false },
        ].map((stat) => (
          <div key={stat.label} className="border border-[#e5e7eb] p-5 text-center">
            <p className={`mb-1 text-3xl font-bold ${stat.accent ? 'text-accent' : 'text-black'}`}>{stat.value}</p>
            <p className="text-xs tracking-wide text-gray-400 uppercase">{stat.label}</p>
          </div>
        ))}
      </div>
      <div>
        <h4 className="mb-4 text-xs font-bold tracking-widest text-gray-400 uppercase">{txHistory}</h4>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-13.5 animate-pulse border border-[#e5e7eb] bg-gray-50" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="py-4 text-xs text-gray-400">{lEmptyHistory}</p>
        ) : (
          <div className="space-y-2">
            {history.map((tx, idx) => {
              const desc = tx.comment?.trim() || TYPE_LABELS[tx.type] || tx.type;
              return (
                <div
                  key={`${tx.createdAt ?? idx}-${tx.type}-${tx.amount}`}
                  className="flex items-center justify-between border border-[#e5e7eb] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{desc}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.sign > 0 ? 'text-[#16a34a]' : 'text-(--sale)'}`}>
                    {tx.sign > 0 ? '+' : '−'}
                    {tx.amount.toLocaleString()} pts
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
