'use client';
import { Banknote, CreditCard, Lock, QrCode, Smartphone, Wallet } from 'lucide-react';

import type { PaymentAccount } from '@/lib/oneentry/payments/accounts';

import { OptionCard } from './PaymentPage.parts';

// Pick an icon based on OE `identifier` — hand-picked substrings so cash /
// wallets / card methods each get a recognisable glyph. Unknown identifiers
// fall back to a generic wallet.
function iconFor(identifier: string): React.ReactNode {
  const id = identifier.toLowerCase();
  if (id.includes('cash')) return <Banknote size={20} />;
  if (id.includes('apple') || id.includes('google') || id.includes('pay_')) return <Smartphone size={20} />;
  if (id.includes('qr')) return <QrCode size={20} />;
  if (id.includes('card') || id.includes('stripe')) return <CreditCard size={20} />;
  return <Wallet size={20} />;
}

interface PaymentMethodsListProps {
  accounts: PaymentAccount[];
  selected: string;
  onSelect: (identifier: string) => void;
  onlineSectionTitle: string;
  offlineSectionTitle: string;
  dividerLabel: string;
  redirectHint: string;
}

// Renders payment options split into "pay on delivery" (custom accounts) and
// "online prepayment" (stripe accounts). Sections that end up empty are
// omitted, and the OR divider is only shown when both are present.
export function PaymentMethodsList({
  accounts,
  selected,
  onSelect,
  onlineSectionTitle,
  offlineSectionTitle,
  dividerLabel,
  redirectHint,
}: PaymentMethodsListProps) {
  const offline = accounts.filter((a) => a.type === 'custom');
  const online = accounts.filter((a) => a.type === 'stripe');

  const renderCard = (acc: PaymentAccount) => (
    <OptionCard
      key={acc.identifier}
      id={acc.identifier}
      selected={selected}
      onSelect={onSelect}
      icon={iconFor(acc.identifier)}
      title={acc.title}
      subtitle={acc.description || undefined}
    >
      {acc.type === 'stripe' && (
        <div className="flex items-start gap-3 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 pt-4">
          <Lock size={16} className="mt-0.5 shrink-0 text-green-600" />
          <p className="text-xs leading-relaxed text-gray-600">{redirectHint}</p>
        </div>
      )}
    </OptionCard>
  );

  return (
    <>
      {offline.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-4 px-1 text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
            {offlineSectionTitle}
          </h2>
          {offline.map(renderCard)}
        </div>
      )}

      {offline.length > 0 && online.length > 0 && (
        <div className="mb-6 flex items-center gap-3 text-gray-400">
          <div className="flex-1 border-t border-[#e5e7eb]" />
          <span className="text-xs font-semibold tracking-widest uppercase">{dividerLabel}</span>
          <div className="flex-1 border-t border-[#e5e7eb]" />
        </div>
      )}

      {online.length > 0 && (
        <div>
          <h2 className="mb-4 px-1 text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">{onlineSectionTitle}</h2>
          {online.map(renderCard)}
        </div>
      )}
    </>
  );
}
