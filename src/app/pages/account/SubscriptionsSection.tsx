'use client';
import React from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { SectionTitle } from './shared';

// ─── Subscriptions section ──────────────────────────────────────────────────
/** Flat on purpose. */
export const SUBSCRIPTIONS_LABELS = {
  title: 'Subscription Management',
  emailNewsletterLabel: 'Email Newsletter',
  emailNewsletterDesc: 'Trends, events, exclusive offers & new arrivals',
  smsNotificationsLabel: 'SMS Notifications',
  smsNotificationsDesc: 'Order updates, flash sales & special events',
  pushNotificationsLabel: 'Push Notifications',
  pushNotificationsDesc: 'Browser notifications for new arrivals & sales',
  orderUpdatesLabel: 'Order Updates',
  orderUpdatesDesc: 'Shipping status, delivery confirmations & returns',
  newArrivalsLabel: 'New Arrivals',
  newArrivalsDesc: 'Be first to know when new collections drop',
  saleAlertsLabel: 'Sale Alerts',
  saleAlertsDesc: 'Exclusive early access to sales & promotions',
  loyaltyUpdatesLabel: 'Loyalty Updates',
  loyaltyUpdatesDesc: 'Bonus points, tier upgrades & member rewards',
} as const;

/** The toggles, in render order. */
const SUBSCRIPTION_KEYS = [
  'emailNewsletter',
  'smsNotifications',
  'pushNotifications',
  'orderUpdates',
  'newArrivals',
  'saleAlerts',
  'loyaltyUpdates',
] as const;

const EMPTY_SUBS = Object.fromEntries(SUBSCRIPTION_KEYS.map((k) => [k, false])) as Record<
  (typeof SUBSCRIPTION_KEYS)[number],
  boolean
>;

/** One notification toggle row. */
function Toggle({
  value,
  onChange,
  label,
  desc,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center justify-between border border-[#e5e7eb] p-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`relative ml-4 h-6 w-12 shrink-0 rounded-xl transition-colors focus-visible:outline-none ${
          value ? 'bg-black' : 'bg-[#d1d5db]'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${value ? 'left-6.5' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

export function SubscriptionsSection() {
  const L = useDict('subscription_management_', SUBSCRIPTIONS_LABELS);
  const { user, updateSubscriptions } = useAuth();
  const subs = user?.subscriptions ?? EMPTY_SUBS;
  const lTitle = useT('subscription_management_title', L.title);

  const toggle = (key: keyof typeof subs) => {
    void updateSubscriptions({ ...subs, [key]: !subs[key] });
  };

  return (
    <div>
      <SectionTitle title={lTitle} />
      <div className="space-y-3">
        {SUBSCRIPTION_KEYS.map((key) => (
          <Toggle
            key={key}
            value={subs[key]}
            onChange={() => toggle(key)}
            label={L[`${key}Label`]}
            desc={L[`${key}Desc`]}
          />
        ))}
      </div>
    </div>
  );
}
