'use client';
import React from 'react';

import { type useAuth } from '@/app/context/AuthContext';
import { LOYALTY_CARD_LABELS } from '@/app/data/accountLabels';
import { snakeKey } from '@/lib/oneentry/labels/dict';
import { useDict, useList, useT } from '@/lib/oneentry/labels/DictContext';

import { ACCENT, fmt } from './shared';

// Backward-compat re-exports for any code still importing them from this module.
export const TIER_PERKS = LOYALTY_CARD_LABELS.perks;
export const TIER_ORDER = LOYALTY_CARD_LABELS.tierOrder;

export function LoyaltyCard({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const L = useDict('user_account_loyalty_', LOYALTY_CARD_LABELS);
  const lLoyaltyStatus = useT('loyalty_status', L.loyaltyStatus);
  const lDiscount = useT('my_data_top_banner_discount', L.discount);
  const lBonuses = useT('my_data_top_banner_bonuses', L.bonuses);
  const lPurchases = useT('my_data_top_banner_purchases', L.purchasesPrefix);
  const lNextLevel = useT('my_data_top_banner_next_level_at', L.nextLevelPrefix);
  // Show the next-tier target whenever there's a positive threshold to
  // aim at, even if the shopper is already past it (edge case where LTV
  // caught up mid-session). AuthContext computes the target via OE first,
  // fallback ladder second — so a Bronze shopper always sees "$X more to
  // Silver" even before Silver exists in OE.
  const hasNextTier = user.nextLevelAmount > 0;
  const remainingToNext = Math.max(0, user.nextLevelAmount - user.totalPurchases);
  const progress = hasNextTier ? Math.min((user.totalPurchases / user.nextLevelAmount) * 100, 100) : 100;
  const statusColors: Record<string, string> = {
    Member: '#9ca3af',
    Bronze: '#cd7f32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
  };
  const bgColor = statusColors[user.status] ?? '#C0C0C0';
  const nextTierIdx = L.tierOrder.indexOf(user.status as (typeof L.tierOrder)[number]) + 1;
  const nextTierName =
    hasNextTier && nextTierIdx > 0 && nextTierIdx < L.tierOrder.length ? L.tierOrder[nextTierIdx] : null;
  // Perks are a `tier → string[]` map: two levels of structure, so `mergeDict`
  // leaves both alone. Each tier gets one comma-separated marker instead,
  // resolved for the tier actually on screen.
  const tier = L.perks[user.status] ? user.status : 'Member';
  const codedPerks = L.perks[tier] ?? L.perks.Member ?? L.perks.Silver;
  const rawPerks = useList(`user_account_loyalty_perks_${snakeKey(tier)}`, codedPerks);
  const perks = rawPerks.map((p) => (p === L.perkPlaceholder ? L.perkDiscountTpl(user.discount) : p));
  // No discount block for Member — hide the "0%" card so the top-right column
  // doesn't scream "you get nothing"; just show bonuses which stay meaningful.
  const showDiscount = user.status !== 'Member' && user.discount > 0;

  return (
    <div
      className="relative mb-8 min-h-40 overflow-hidden bg-[linear-gradient(135deg,#1a1a1a_0%,#333_100%)] p-6 text-white"
      style={{ '--tier': bgColor, '--accent': ACCENT } as React.CSSProperties}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 size-48 rounded-full bg-(--tier) opacity-10" />
      <div className="absolute -right-5 -bottom-16 size-64 rounded-full bg-(--tier) opacity-10" />

      <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="bg-(--tier) px-2 py-0.5 text-xs font-bold tracking-widest text-black uppercase">
              {user.status}
            </span>
            <span className="text-xs tracking-wide uppercase opacity-50">{lLoyaltyStatus}</span>
          </div>
          <ul className="space-y-1.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-xs opacity-80">
                <span className="text-[10px] font-bold text-(--tier)">✓</span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-6 sm:flex-col sm:gap-3 sm:text-right">
          {showDiscount && (
            <div>
              <p className="text-2xl font-bold text-accent">{user.discount}%</p>
              <p className="text-xs tracking-wide uppercase opacity-50">{lDiscount}</p>
              {user.discountMaxAmount != null && user.discountMaxAmount > 0 && (
                <p className="mt-0.5 text-[10px] opacity-40">max −${user.discountMaxAmount}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-2xl font-bold">{user.bonuses.toLocaleString()}</p>
            <p className="text-xs tracking-wide uppercase opacity-50">{lBonuses}</p>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="relative z-10 mt-5">
        <div className="mb-1.5 flex justify-between text-xs opacity-60">
          <span>
            {lPurchases} {fmt(user.totalPurchases)}
          </span>
          {hasNextTier && (
            <span>
              {lNextLevel} {fmt(user.nextLevelAmount)}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-white/20">
          <div className="h-full bg-(--tier) transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs opacity-50">
          {nextTierName ? L.moreToTierTpl(fmt(remainingToNext), nextTierName) : L.highestTier}
        </p>
      </div>
    </div>
  );
}
