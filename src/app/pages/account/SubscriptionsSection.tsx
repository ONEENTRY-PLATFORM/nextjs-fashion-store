'use client'
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { SectionTitle } from './shared';
import { SUBSCRIPTIONS_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

const EMPTY_SUBS = {
  emailNewsletter: false, smsNotifications: false, pushNotifications: false,
  orderUpdates: false, newArrivals: false, saleAlerts: false, loyaltyUpdates: false,
};

export function SubscriptionsSection() {
  const { user, updateSubscriptions } = useAuth();
  const subs = user?.subscriptions ?? EMPTY_SUBS;
  const lTitle = useT('subscription_management', 'subscription_management_title', L.title);

  const toggle = (key: keyof typeof subs) => {
    void updateSubscriptions({ ...subs, [key]: !subs[key] });
  };

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: () => void; label: string; desc: string }) => (
    <div className="flex items-center justify-between p-4 border border-[#e5e7eb]">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`flex-shrink-0 w-12 h-6 relative focus-visible:outline-none transition-colors ml-4 rounded-xl ${
          value ? 'bg-black' : 'bg-[#d1d5db]'
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${value ? 'left-[26px]' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div>
      <SectionTitle title={lTitle} />
      <div className="space-y-3">
        <Toggle value={subs.emailNewsletter}   onChange={() => toggle('emailNewsletter')}   label={L.emailNewsletter.label}   desc={L.emailNewsletter.desc} />
        <Toggle value={subs.smsNotifications}  onChange={() => toggle('smsNotifications')}  label={L.smsNotifications.label}  desc={L.smsNotifications.desc} />
        <Toggle value={subs.pushNotifications} onChange={() => toggle('pushNotifications')} label={L.pushNotifications.label} desc={L.pushNotifications.desc} />
        <Toggle value={subs.orderUpdates}      onChange={() => toggle('orderUpdates')}      label={L.orderUpdates.label}      desc={L.orderUpdates.desc} />
        <Toggle value={subs.newArrivals}       onChange={() => toggle('newArrivals')}       label={L.newArrivals.label}       desc={L.newArrivals.desc} />
        <Toggle value={subs.saleAlerts}        onChange={() => toggle('saleAlerts')}        label={L.saleAlerts.label}        desc={L.saleAlerts.desc} />
        <Toggle value={subs.loyaltyUpdates}    onChange={() => toggle('loyaltyUpdates')}    label={L.loyaltyUpdates.label}    desc={L.loyaltyUpdates.desc} />
      </div>
    </div>
  );
}
