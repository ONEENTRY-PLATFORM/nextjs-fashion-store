'use client'
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ACCENT, fmt } from './shared';
import { LOYALTY_CARD_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

// Backward-compat re-exports for any code still importing them from this module.
export const TIER_PERKS = L.perks;
export const TIER_ORDER = L.tierOrder;

export function LoyaltyCard({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const lLoyaltyStatus = useT('user_account',                'loyalty_status',                              L.loyaltyStatus);
  const lDiscount      = useT('user_account_silver_status',  'my_data_top_banner_discount',                 L.discount);
  const lBonuses       = useT('user_account_silver_status',  'my_data_top_banner_bonuses',                  L.bonuses);
  const lPurchases     = useT('user_account_silver_status',  'my_data_top_banner_purchases',                L.purchasesPrefix);
  const lNextLevel     = useT('user_account_silver_status',  'my_data_top_banner_next_level_at',            L.nextLevelPrefix);
  // Show the next-tier target whenever there's a positive threshold to
  // aim at, even if the shopper is already past it (edge case where LTV
  // caught up mid-session). AuthContext computes the target via OE first,
  // fallback ladder second — so a Bronze shopper always sees "$X more to
  // Silver" even before Silver exists in OE.
  const hasNextTier = user.nextLevelAmount > 0;
  const remainingToNext = Math.max(0, user.nextLevelAmount - user.totalPurchases);
  const progress = hasNextTier
    ? Math.min((user.totalPurchases / user.nextLevelAmount) * 100, 100)
    : 100;
  const statusColors: Record<string, string> = {
    Member: '#9ca3af', Bronze: '#cd7f32', Silver: '#C0C0C0', Gold: '#FFD700', Platinum: '#E5E4E2',
  };
  const bgColor = statusColors[user.status] ?? '#C0C0C0';
  const nextTierIdx = L.tierOrder.indexOf(user.status as typeof L.tierOrder[number]) + 1;
  const nextTierName = hasNextTier && nextTierIdx > 0 && nextTierIdx < L.tierOrder.length
    ? L.tierOrder[nextTierIdx]
    : null;
  const rawPerks = L.perks[user.status] ?? L.perks.Member ?? L.perks.Silver;
  const perks = rawPerks.map(p => p === L.perkPlaceholder ? L.perkDiscountTpl(user.discount) : p);
  // No discount block for Member — hide the "0%" card so the top-right column
  // doesn't scream "you get nothing"; just show bonuses which stay meaningful.
  const showDiscount = user.status !== 'Member' && user.discount > 0;

  return (
    <div
      className="relative overflow-hidden mb-8 p-6 text-white min-h-[160px] bg-[linear-gradient(135deg,#1a1a1a_0%,#333_100%)]"
      style={{ '--tier': bgColor, '--accent': ACCENT } as React.CSSProperties}
    >
      {/* Decorative circles */}
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10 bg-[var(--tier)]" />
      <div className="absolute -right-5 -bottom-16 w-64 h-64 rounded-full opacity-10 bg-[var(--tier)]" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 tracking-widest uppercase text-black font-bold bg-[var(--tier)]">
              {user.status}
            </span>
            <span className="text-xs opacity-50 tracking-wide uppercase">{lLoyaltyStatus}</span>
          </div>
          <ul className="space-y-1.5">
            {perks.map(perk => (
              <li key={perk} className="flex items-center gap-2 text-xs opacity-80">
                <span className="font-bold text-[10px] text-[var(--tier)]">✓</span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex sm:flex-col gap-6 sm:gap-3 sm:text-right">
          {showDiscount && (
            <div>
              <p className="text-2xl font-bold text-[var(--accent)]">{user.discount}%</p>
              <p className="text-xs opacity-50 uppercase tracking-wide">{lDiscount}</p>
              {user.discountMaxAmount != null && user.discountMaxAmount > 0 && (
                <p className="text-[10px] opacity-40 mt-0.5">max −${user.discountMaxAmount}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-2xl font-bold">{user.bonuses.toLocaleString()}</p>
            <p className="text-xs opacity-50 uppercase tracking-wide">{lBonuses}</p>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="relative z-10 mt-5">
        <div className="flex justify-between text-xs opacity-60 mb-1.5">
          <span>{lPurchases} {fmt(user.totalPurchases)}</span>
          {hasNextTier && <span>{lNextLevel} {fmt(user.nextLevelAmount)}</span>}
        </div>
        <div className="w-full h-1.5 bg-white/20">
          <div
            className="h-full transition-all duration-500 bg-[var(--tier)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs opacity-50 mt-1">
          {nextTierName
            ? L.moreToTierTpl(fmt(remainingToNext), nextTierName)
            : L.highestTier}
        </p>
      </div>
    </div>
  );
}
