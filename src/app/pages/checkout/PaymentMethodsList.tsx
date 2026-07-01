'use client';
import { Banknote, CreditCard, Lock, QrCode, Smartphone, Wallet } from 'lucide-react';
import { OptionCard } from './PaymentPage.parts';
import type { PaymentAccount } from '../../../lib/oneentry/payments/accounts';

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
        <div className="pt-4 flex items-start gap-3 px-4 py-3 bg-[#fafafa] border border-[#e5e7eb]">
          <Lock size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">{redirectHint}</p>
        </div>
      )}
    </OptionCard>
  );

  return (
    <>
      {offline.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs tracking-[0.2em] uppercase mb-4 px-1 font-bold text-gray-400">
            {offlineSectionTitle}
          </h2>
          {offline.map(renderCard)}
        </div>
      )}

      {offline.length > 0 && online.length > 0 && (
        <div className="flex items-center gap-3 mb-6 text-gray-400">
          <div className="flex-1 border-t border-[#e5e7eb]" />
          <span className="text-xs tracking-widest uppercase font-semibold">{dividerLabel}</span>
          <div className="flex-1 border-t border-[#e5e7eb]" />
        </div>
      )}

      {online.length > 0 && (
        <div>
          <h2 className="text-xs tracking-[0.2em] uppercase mb-4 px-1 font-bold text-gray-400">
            {onlineSectionTitle}
          </h2>
          {online.map(renderCard)}
        </div>
      )}
    </>
  );
}
