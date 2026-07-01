'use client';
import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoginModal } from '../app/components/LoginModal';
import { useAuth } from '../app/context/AuthContext';

/** Wrapper that immediately opens the login modal */
function OpenLoginModal() {
  const { openLoginModal } = useAuth();
  useEffect(() => { openLoginModal(); }, [openLoginModal]);
  return <LoginModal />;
}

const meta = {
  title: 'Components / LoginModal',
  component: LoginModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof LoginModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open — login form',
  render: () => <OpenLoginModal />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <LoginModal />,
};
