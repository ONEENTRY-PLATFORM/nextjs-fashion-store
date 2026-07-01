// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

const base = Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals];
const ts = Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript];

export default [// ── Ignored paths ──
{
  ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**'],
}, // ── Next.js base + TypeScript rules ──
...base, ...ts, // ── Project-specific overrides ──
{
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // React
    'react/self-closing-comp': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',

    // Next.js
    '@next/next/no-img-element': 'error',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
}, ...storybook.configs["flat/recommended"]];
