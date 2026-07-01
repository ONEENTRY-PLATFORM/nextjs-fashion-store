'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RegisterModal } from '../app/components/RegisterModal';
import { useAuth } from '../app/context/AuthContext';

/** Wrapper that immediately opens the register modal */
function OpenRegisterModal() {
  const { openRegisterModal } = useAuth();
  useEffect(() => { openRegisterModal(); }, [openRegisterModal]);
  return <RegisterModal />;
}

const meta = {
  title: 'Components / RegisterModal',
  component: RegisterModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof RegisterModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open — registration form',
  render: () => <OpenRegisterModal />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <RegisterModal />,
};
