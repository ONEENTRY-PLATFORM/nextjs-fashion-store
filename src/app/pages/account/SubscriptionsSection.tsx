'use client';
import React from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { useAuth } from '../../context/AuthContext';
import { SUBSCRIPTIONS_LABELS } from '../../data/accountLabels';
import { SectionTitle } from './shared';

const EMPTY_SUBS = {
  emailNewsletter: false,
  smsNotifications: false,
  pushNotifications: false,
  orderUpdates: false,
  newArrivals: false,
  saleAlerts: false,
  loyaltyUpdates: false,
};

/**
 * One notification toggle row. Declared at module scope, not inside
 * `SubscriptionsSection` — a component created during render is a brand-new
 * type on every pass, so React unmounts and remounts it, throwing away its
 * DOM state (focus, transition) each time the parent re-renders.
 *
 * @param   props          - Row props.
 * @param  props.value    - Current toggle state.
 * @param props.onChange - Called when the shopper flips it.
 * @param   props.label    - Visible label / accessible name.
 * @param   props.desc     - Supporting copy under the label.
 * @returns The rendered row.
 */
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
        <Toggle
          value={subs.emailNewsletter}
          onChange={() => toggle('emailNewsletter')}
          label={L.emailNewsletter.label}
          desc={L.emailNewsletter.desc}
        />
        <Toggle
          value={subs.smsNotifications}
          onChange={() => toggle('smsNotifications')}
          label={L.smsNotifications.label}
          desc={L.smsNotifications.desc}
        />
        <Toggle
          value={subs.pushNotifications}
          onChange={() => toggle('pushNotifications')}
          label={L.pushNotifications.label}
          desc={L.pushNotifications.desc}
        />
        <Toggle
          value={subs.orderUpdates}
          onChange={() => toggle('orderUpdates')}
          label={L.orderUpdates.label}
          desc={L.orderUpdates.desc}
        />
        <Toggle
          value={subs.newArrivals}
          onChange={() => toggle('newArrivals')}
          label={L.newArrivals.label}
          desc={L.newArrivals.desc}
        />
        <Toggle
          value={subs.saleAlerts}
          onChange={() => toggle('saleAlerts')}
          label={L.saleAlerts.label}
          desc={L.saleAlerts.desc}
        />
        <Toggle
          value={subs.loyaltyUpdates}
          onChange={() => toggle('loyaltyUpdates')}
          label={L.loyaltyUpdates.label}
          desc={L.loyaltyUpdates.desc}
        />
      </div>
    </div>
  );
}
