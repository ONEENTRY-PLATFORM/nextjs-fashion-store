'use client'
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ACCENT } from './shared';
import { SALE_COLOR } from '../../constants/colors';
import { LoyaltyCard } from './LoyaltyCard';
import { PersonalInfoSection } from './myData/PersonalInfoSection';
import { PasswordSection } from './myData/PasswordSection';
import { AddressesSection } from './myData/AddressesSection';
import { SocialNetworksSection } from './myData/SocialNetworksSection';
import { ConsentSection } from './myData/ConsentSection';
import { AccountDeletionSection } from './myData/AccountDeletionSection';

export function MyDataSection() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div
      className="space-y-10"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
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
