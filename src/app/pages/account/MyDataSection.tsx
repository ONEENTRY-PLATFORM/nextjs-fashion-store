'use client';
import React from 'react';

import { SALE_COLOR } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { LoyaltyCard } from './LoyaltyCard';
import { AccountDeletionSection } from './myData/AccountDeletionSection';
import { AddressesSection } from './myData/AddressesSection';
import { ConsentSection } from './myData/ConsentSection';
import { PasswordSection } from './myData/PasswordSection';
import { PersonalInfoSection } from './myData/PersonalInfoSection';
import { SocialNetworksSection } from './myData/SocialNetworksSection';
import { ACCENT } from './shared';

export function MyDataSection() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-10" style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}>
      <LoyaltyCard user={user} />
      <PersonalInfoSection />
      <PasswordSection />
      <AddressesSection />
      <SocialNetworksSection />
      <ConsentSection />
      <AccountDeletionSection />
    </div>
  );
}
