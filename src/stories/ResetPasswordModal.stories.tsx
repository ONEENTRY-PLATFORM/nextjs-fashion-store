'use client';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React, { useEffect } from 'react';

import { ResetPasswordModal } from '@/app/components/auth/ResetPasswordModal';
import { useAuth } from '@/app/context/AuthContext';

/** Wrapper that opens the recovery modal on its first step. */
function OpenResetPasswordModal() {
  const { openResetPasswordModal } = useAuth();
  useEffect(() => {
    openResetPasswordModal();
  }, [openResetPasswordModal]);
  return <ResetPasswordModal />;
}

/**
 * Same, opened the way `LoginModal` opens it: with the address the shopper had
 * already typed into the sign-in field.
 */
function OpenResetPasswordModalPrefilled() {
  const { openResetPasswordModal } = useAuth();
  useEffect(() => {
    openResetPasswordModal('shopper@example.com');
  }, [openResetPasswordModal]);
  return <ResetPasswordModal />;
}

const meta = {
  title: 'Components / ResetPasswordModal',
  component: ResetPasswordModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ResetPasswordModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Step 1 — ask for the email',
  render: () => <OpenResetPasswordModal />,
};

export const Prefilled: Story = {
  name: 'Step 1 — prefilled from sign-in',
  render: () => <OpenResetPasswordModalPrefilled />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <ResetPasswordModal />,
};
