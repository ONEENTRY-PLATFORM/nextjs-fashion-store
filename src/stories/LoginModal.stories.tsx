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

/** Wrapper that opens the modal and injects an auth error banner */
function OpenLoginModalWithError() {
  const { openLoginModal, setAuthError } = useAuth();
  useEffect(() => {
    openLoginModal();
    setAuthError('This account uses Google Sign-In. Please continue with Google.');
  }, [openLoginModal, setAuthError]);
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

export const WithAuthError: Story = {
  name: 'With auth error banner',
  render: () => <OpenLoginModalWithError />,
};

export const Closed: Story = {
  name: 'Closed — renders nothing',
  render: () => <LoginModal />,
};
