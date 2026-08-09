import '../app/globals.css';

import type { Decorator, Preview } from '@storybook/nextjs-vite';
import React from 'react';
import { Provider } from 'react-redux';

import { AuthProvider } from '@/app/context/AuthContext';
import { CatalogAccentContext } from '@/app/context/CatalogAccentContext';
import { makeStore } from '@/app/store';

/**
 * Provider stack shared by every story: Redux store + AuthProvider + CatalogAccentContext.
 *
 * Uses useState so the store is created ONCE per story mount (stable across re-renders),
 * and the localStorage key is wiped before each new store to prevent state bleed between stories.
 *
 * @param props - Component props.
 * @param props.children - Story tree rendered inside the providers.
 * @returns The story wrapped in the global provider stack.
 */
const StoryProviders = ({ children }: { children: React.ReactNode }) => {
  const [store] = React.useState(() => {
    // Clear persisted state so each story starts from a clean slate.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('oe_store');
    }
    return makeStore();
  });

  return (
    <Provider store={store}>
      <AuthProvider>
        <CatalogAccentContext.Provider value="#F88A8A">{children}</CatalogAccentContext.Provider>
      </AuthProvider>
    </Provider>
  );
};

/**
 * Global decorator: renders each story inside {@link StoryProviders}.
 */
const withProviders: Decorator = (Story) => (
  <StoryProviders>
    <Story />
  </StoryProviders>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    // Enable Next.js App Router mocks globally (useRouter, usePathname, etc.)
    // image.unoptimized suppresses "loader does not implement width" warnings
    nextjs: {
      appDirectory: true,
      image: {
        unoptimized: true,
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
