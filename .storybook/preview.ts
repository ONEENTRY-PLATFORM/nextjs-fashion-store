import React from 'react';
import type { Preview, Decorator } from '@storybook/nextjs-vite';
import { Provider } from 'react-redux';
import { makeStore } from '../src/app/store';
import { CatalogAccentContext } from '../src/app/context/CatalogAccentContext';
import { AuthProvider } from '../src/app/context/AuthContext';
import '../app/globals.css';

/**
 * Global decorator: wraps every story with Redux store + AuthProvider + CatalogAccentContext.
 *
 * Uses useState so the store is created ONCE per story mount (stable across re-renders),
 * and the localStorage key is wiped before each new store to prevent state bleed between stories.
 */
const withProviders: Decorator = (Story) => {
  const [store] = React.useState(() => {
    // Clear persisted state so each story starts from a clean slate.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('oe_store');
    }
    return makeStore();
  });

  return React.createElement(
    Provider,
    { store },
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        CatalogAccentContext.Provider,
        { value: '#F88A8A' },
        React.createElement(Story)
      )
    )
  );
};

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